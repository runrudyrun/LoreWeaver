import { Devvit } from '@devvit/public-api';
import { RedisWrapper } from './redis';
import { validateShardText, isProfane } from './validation';
import { requireAuthenticated, getUserIdentifier, getUserName, requireModerator } from './auth';
import { canonizeAndPost } from './canonize';
import { Story, Shard, RuleCard, RealtimeEvent } from './types';


const RATE_LIMIT_PER_HOUR = 2;
const MOD_REVIEW_ENABLED = true;

export async function initializeStory(context: Devvit.Context): Promise<void> {
  const redis = new RedisWrapper(context.redis);
  const currentStory = await redis.getCurrentStory();
  
  if (!currentStory) {
    // Create initial story
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setHours(23, 50, 0, 0); // 23:50 BRT
    
    const story: Story = {
      id: `story_${now.getTime()}`,
      chapter: 1,
      ruleCard: {
        bannedWords: ['suddenly', 'then', 'just'],
        requiredTags: ['compass', 'key', 'note'],
        styleTag: 'noir-reportage'
      },
      endsAtISO: endsAt.toISOString(),
      title: 'LoreWeave Chapter 1: The Beginning',
      createdAtISO: now.toISOString(),
      subreddit: context.subredditName || 'test',
      authorName: 'LoreWeaveBot'
    };
    
    await redis.setCurrentStory(story);
    await redis.setStoryMeta(story.id, {
      title: story.title,
      createdAtISO: story.createdAtISO,
      subreddit: story.subreddit,
      authorName: story.authorName
    });
    await redis.setStoryRule(story.id, story.ruleCard);
  }
}

Devvit.addSchedulerJob({
  name: 'canonizeAndPost',
  onRun: async (event, context) => {
    await canonizeAndPost(context as any);
  }
});

// API Endpoints
Devvit.addCustomPostType({
  name: 'LoreWeave',
  height: 'tall',
  render: (context) => {
    // Initialize story on first load
    context.scheduler.runJob({
      name: 'initializeStory',
      data: {},
      runAt: new Date()
    });
    
    // Return webview configuration
    return {
      webView: {
        url: 'webview/index.html',
        height: 'tall'
      }
    } as any;
  }
});

// Export API functions for Devvit handlers
export async function handleShardCreate(request: any, context: Devvit.Context) {
  requireAuthenticated(context);
  
  const { storyId, parentId, text } = request.json();
  const redis = new RedisWrapper(context.redis);
  
  // Get current story and validate
  const currentStory = await redis.getCurrentStory();
  if (!currentStory || currentStory.id !== storyId) {
    return { success: false, error: 'Invalid story' };
  }
  
  // Check if parent exists and is not frozen/hidden
  if (parentId) {
    const parentShard = await redis.getShard(parentId);
    if (!parentShard) {
      return { success: false, error: 'Parent shard not found' };
    }
    if (parentShard.frozen || parentShard.hidden) {
      return { success: false, error: 'Cannot continue from this shard' };
    }
  }
  
  // Rate limit check
  const userName = getUserName(context);
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const rateCount = await redis.getUserRateCount(userName, today);
  
  if (rateCount >= RATE_LIMIT_PER_HOUR) {
    return { success: false, error: 'Rate limit exceeded. Try again later.' };
  }
  
  // Validate text against RuleCard
  const validation = validateShardText(text, currentStory.ruleCard);
  if (!validation.valid) {
    return { success: false, error: 'Validation failed', violations: validation.violations };
  }
  
  // Check for profanity
  const violations = [...validation.violations];
  if (isProfane(text)) {
    violations.push('Contains inappropriate content');
  }
  
  // Create shard
  const shardId = `shard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const shard: Shard = {
    id: shardId,
    storyId,
    parentId: parentId || undefined,
    text,
    authorName: userName,
    authorId: getUserIdentifier(context),
    tsISO: new Date().toISOString(),
    votes: 0,
    hidden: MOD_REVIEW_ENABLED && rateCount === 0, // Hide first shard for mod review
    frozen: false,
    violations
  };
  
  await redis.setShard(shard);
  
  if (parentId) {
    await redis.addShardChild(parentId, shardId);
  } else {
    // Set as root shard for the story
    const storyMeta = await redis.getStoryMeta(storyId);
    if (storyMeta) {
      storyMeta.rootShardId = shardId;
      await redis.setStoryMeta(storyId, storyMeta);
    }
  }
  
  // Add to story indices
  await redis.addShardToStoryByVotes(storyId, shardId, 0);
  await redis.addShardToStoryByTime(storyId, shardId, Date.now());
  
  // Increment rate counter
  await redis.incrementUserRateCount(userName, today);
  
  // Publish realtime event
  const event: RealtimeEvent = {
    type: 'shardCreated',
    payload: {
      shardId,
      storyId,
      parentId,
      text: text.substring(0, 100), // Truncate for realtime
      authorName: userName,
      votes: 0
    }
  };
  
  context.realtime.send(`story:${storyId}`, event as any);
  
  return {
    success: true,
    shardId,
    violations: violations.length > 0 ? violations : undefined
  };
}

export async function handleShardVote(request: any, context: Devvit.Context) {
  requireAuthenticated(context);
  
  const { storyId, shardId, dir } = request.json();
  const redis = new RedisWrapper(context.redis);
  
  // Validate shard exists
  const shard = await redis.getShard(shardId);
  if (!shard || shard.storyId !== storyId) {
    return { success: false, error: 'Shard not found' };
  }
  
  if (shard.hidden) {
    return { success: false, error: 'Cannot vote on hidden shard' };
  }
  
  // Update vote count
  const newVotes = await redis.incrementShardVotes(shardId, dir);
  
  // Update vote ranking
  await redis.addShardToStoryByVotes(storyId, shardId, newVotes);
  
  // Publish realtime event
  const event: RealtimeEvent = {
    type: 'voteUpdated',
    payload: {
      shardId,
      votes: newVotes
    }
  };
  
  context.realtime.send(`story:${storyId}`, event as any);
  
  return {
    success: true,
    shardId,
    votes: newVotes
  };
}

export async function handleStoryState(request: any, context: Devvit.Context) {
  const { storyId, tab = 'top', cursor = '0', limit = 20 } = request.json();
  const redis = new RedisWrapper(context.redis);
  
  const story = await redis.getCurrentStory();
  if (!story || story.id !== storyId) {
    return { success: false, error: 'Story not found' };
  }
  
  const start = parseInt(cursor);
  const end = start + limit - 1;
  
  let shardIds: string[] = [];
  if (tab === 'top') {
    shardIds = await redis.getShardsByVotes(storyId, start, end);
  } else {
    shardIds = await redis.getShardsByTime(storyId, start, end);
  }
  
  const shards: Shard[] = [];
  for (const shardId of shardIds) {
    const shard = await redis.getShard(shardId);
    if (shard && !shard.hidden) {
      shards.push(shard);
    }
  }
  
  const summaries = shards.map(shard => ({
    id: shard.id,
    preview: shard.text.substring(0, 80) + (shard.text.length > 80 ? '...' : ''),
    authorName: shard.authorName,
    votes: shard.votes,
    createdAtISO: shard.tsISO,
    hasChildren: true // Will be determined by checking children
  }));
  
  return {
    success: true,
    story: {
      id: story.id,
      chapter: story.chapter,
      ruleCard: story.ruleCard,
      endsAtISO: story.endsAtISO,
      title: story.title
    },
    shards: summaries,
    nextCursor: shardIds.length === limit ? (start + limit).toString() : null
  };
}

export async function handleModHide(request: any, context: Devvit.Context) {
  requireModerator(context);
  
  const { storyId, shardId, hidden } = request.json();
  const redis = new RedisWrapper(context.redis);
  
  const shard = await redis.getShard(shardId);
  if (!shard || shard.storyId !== storyId) {
    return { success: false, error: 'Shard not found' };
  }
  
  await redis.hideShard(shardId, hidden);
  
  return { success: true, shardId, hidden };
}

export async function handleModFreeze(request: any, context: Devvit.Context) {
  requireModerator(context);
  
  const { storyId, shardId, frozen } = request.json();
  const redis = new RedisWrapper(context.redis);
  
  const shard = await redis.getShard(shardId);
  if (!shard || shard.storyId !== storyId) {
    return { success: false, error: 'Shard not found' };
  }
  
  await redis.freezeShard(shardId, frozen);
  
  return { success: true, shardId, frozen };
}

// Initialize handler
export async function handleInitializeStory(event: any, context: Devvit.Context) {
  await initializeStory(context);
}