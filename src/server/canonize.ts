import { Devvit } from '@devvit/public-api';
import { RedisWrapper } from './redis';
import { calculateNoveltyScore, calculateDiversityScore } from './validation';
import { Story, Shard, CanonizeWeights } from './types';

const DEFAULT_WEIGHTS: CanonizeWeights = {
  w1: 0.5, // votes
  w2: 0.3, // novelty
  w3: 0.2, // diversity
  penalty: 0.15
};

interface Path {
  shards: Shard[];
  totalVotes: number;
  noveltyScore: number;
  diversityScore: number;
  penaltyScore: number;
  finalScore: number;
}

export async function canonizeAndPost(context: Devvit.Context): Promise<void> {
  const redis = new RedisWrapper(context.redis);
  
  // Get current story
  const currentStory = await redis.getCurrentStory();
  if (!currentStory) {
    console.log('No current story found');
    return;
  }
  
  console.log(`Canonizing story ${currentStory.id} chapter ${currentStory.chapter}`);
  
  // Get all shards for this story
  const allShards = await redis.getAllShardsInStory(currentStory.id);
  const shardMap = new Map(allShards.map(s => [s.id, s]));
  
  // Build path from root to all leaves
  const rootShardId = allShards.find(s => !s.parentId)?.id;
  if (!rootShardId) {
    console.log('No root shard found');
    return;
  }
  
  const paths = buildPaths(rootShardId, shardMap);
  
  if (paths.length === 0) {
    console.log('No valid paths found');
    return;
  }
  
  // Score all paths
  const scoredPaths = scorePaths(paths, DEFAULT_WEIGHTS);
  
  // Select best path
  const bestPath = scoredPaths[0];
  console.log(`Selected path with score ${bestPath.finalScore}: ${bestPath.shards.length} shards`);
  
  // Compose canonical text
  const canonicalText = composeCanonicalText(bestPath.shards);
  
  // Create new chapter post
  const newChapter = currentStory.chapter + 1;
  const newTitle = `LoreWeave Chapter ${newChapter}: ${generateChapterTitle(canonicalText)}`;
  
  try {
    // Create new interactive post
    const newPost = await context.reddit.submitPost({
      title: newTitle,
      subredditName: currentStory.subreddit,
      text: canonicalText + '\n\n---\n\n*This chapter was collaboratively written by the LoreWeave community.*'
    });
    
    // Create new story entry
    const now = new Date();
    const nextEndsAt = new Date(now);
    nextEndsAt.setHours(23, 50, 0, 0);
    
    const newStory: Story = {
      id: `story_${now.getTime()}`,
      chapter: newChapter,
      ruleCard: generateNextRuleCard(currentStory.ruleCard),
      endsAtISO: nextEndsAt.toISOString(),
      title: newTitle,
      createdAtISO: now.toISOString(),
      subreddit: currentStory.subreddit,
      authorName: 'LoreWeaveBot'
    };
    
    // Update current story
    await redis.setCurrentStory(newStory);
    await redis.setStoryMeta(newStory.id, {
      title: newStory.title,
      createdAtISO: newStory.createdAtISO,
      subreddit: newStory.subreddit,
      authorName: newStory.authorName,
      previousChapterId: currentStory.id
    });
    await redis.setStoryRule(newStory.id, newStory.ruleCard);
    
    console.log(`Successfully created chapter ${newChapter} with post ID ${newPost.id}`);
    
  } catch (error) {
    console.error('Failed to create new chapter:', error);
    throw error;
  }
}

function buildPaths(rootId: string, shardMap: Map<string, Shard>): Path[] {
  const paths: Path[] = [];
  
  function dfs(shardId: string, currentPath: Shard[]): void {
    const shard = shardMap.get(shardId);
    if (!shard || shard.hidden) return;
    
    currentPath.push(shard);
    
    const children = Array.from(shardMap.values()).filter(s => s.parentId === shardId && !s.hidden);
    
    if (children.length === 0) {
      // Leaf node - complete path
      paths.push({
        shards: [...currentPath],
        totalVotes: 0,
        noveltyScore: 0,
        diversityScore: 0,
        penaltyScore: 0,
        finalScore: 0
      });
    } else {
      // Continue down each child path
      for (const child of children) {
        dfs(child.id, currentPath);
      }
    }
    
    currentPath.pop();
  }
  
  dfs(rootId, []);
  return paths;
}

function scorePaths(paths: Path[], weights: CanonizeWeights): Path[] {
  const maxVotes = Math.max(...paths.map(p => p.shards.reduce((sum, s) => sum + s.votes, 0)));
  
  for (const path of paths) {
    // Calculate normalized vote score
    const totalVotes = path.shards.reduce((sum, s) => sum + s.votes, 0);
    path.totalVotes = totalVotes;
    const votesNorm = maxVotes > 0 ? totalVotes / maxVotes : 0;
    
    // Calculate novelty score
    const texts = path.shards.map(s => s.text);
    path.noveltyScore = calculateNoveltyScore(texts);
    
    // Calculate diversity score
    const authors = path.shards.map(s => s.authorName);
    path.diversityScore = calculateDiversityScore(authors);
    
    // Calculate penalty score
    path.penaltyScore = path.shards.reduce((sum, s) => sum + s.violations.length, 0) * weights.penalty;
    
    // Final score
    path.finalScore = 
      weights.w1 * votesNorm + 
      weights.w2 * path.noveltyScore + 
      weights.w3 * path.diversityScore - 
      path.penaltyScore;
  }
  
  // Sort by final score (descending)
  return paths.sort((a, b) => b.finalScore - a.finalScore);
}

function composeCanonicalText(shards: Shard[]): string {
  return shards.map((shard, index) => {
    const text = shard.text.trim();
    if (index === 0) return text;
    
    // Add transition for subsequent shards
    if (text.startsWith('"') || text.startsWith('“')) {
      return ` ${text}`;
    } else if (text.startsWith('But') || text.startsWith('However') || text.startsWith('Yet')) {
      return ` ${text}`;
    } else {
      return ` ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
  }).join('');
}

function generateChapterTitle(text: string): string {
  // Extract first few words or key phrases
  const sentences = text.split(/[.!?]/);
  const firstSentence = sentences[0]?.trim() || '';
  
  if (firstSentence.length > 50) {
    return firstSentence.substring(0, 50) + '...';
  }
  
  // Try to find a meaningful phrase
  const words = firstSentence.split(/\s+/);
  if (words.length >= 3) {
    return words.slice(0, 4).join(' ');
  }
  
  return `Chapter ${new Date().toISOString().split('T')[0]}`;
}

function generateNextRuleCard(currentRule: RuleCard): RuleCard {
  // Rotate through different constraint sets
  const bannedWordSets = [
    ['suddenly', 'then', 'just'],
    ['very', 'really', 'quite'],
    ['actually', 'basically', 'literally'],
    ['I', 'me', 'my', 'myself']
  ];
  
  const requiredTagSets = [
    ['compass', 'key', 'note'],
    ['mirror', 'clock', 'letter'],
    ['door', 'window', 'path'],
    ['voice', 'silence', 'echo']
  ];
  
  const styleTags = [
    'noir-reportage',
    'magical-realism',
    'stream-of-consciousness',
    'minimalist-prose'
  ];
  
  // Simple rotation logic
  const currentBannedIndex = bannedWordSets.findIndex(set => 
    set.every(word => currentRule.bannedWords.includes(word))
  );
  
  const nextBannedIndex = (currentBannedIndex + 1) % bannedWordSets.length;
  const nextRequiredIndex = (currentBannedIndex + 1) % requiredTagSets.length;
  const nextStyleIndex = (currentBannedIndex + 1) % styleTags.length;
  
  return {
    bannedWords: bannedWordSets[nextBannedIndex],
    requiredTags: requiredTagSets[nextRequiredIndex],
    styleTag: styleTags[nextStyleIndex]
  };
}