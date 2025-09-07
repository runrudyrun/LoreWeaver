import { Devvit, RedisClient } from '@devvit/public-api';
import { Story, RuleCard } from '../src/server/types.js';

// Initialize first story for LoreWeaver
async function initFirstStory() {
  console.log('🚀 Initializing first story for LoreWeaver...');
  
  // Generate story ID and timestamps
  const storyId = `story_${Date.now()}`;
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  // Set to 23:50 BRT (America/Sao_Paulo timezone)
  const endsAt = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 50);
  
  // Create the first RuleCard - you can customize this
  const ruleCard: RuleCard = {
    bannedWords: ['dragon', 'magic', 'wizard', 'spell'],
    requiredTags: ['#mystery', '#discovery', '#twist'],
    styleTag: 'noir'
  };
  
  const story: Story = {
    id: storyId,
    chapter: 1,
    ruleCard,
    endsAtISO: endsAt.toISOString(),
    title: 'The First Thread',
    createdAtISO: now.toISOString(),
    subreddit: 'lorecolab_dev', // From devvit.json
    authorName: 'LoreWeaver_System'
  };
  
  console.log('📋 Story configuration:');
  console.log(`   ID: ${storyId}`);
  console.log(`   Chapter: ${story.chapter}`);
  console.log(`   Title: ${story.title}`);
  console.log(`   Ends at: ${story.endsAtISO}`);
  console.log(`   RuleCard: ${JSON.stringify(ruleCard, null, 2)}`);
  
  console.log('\n✅ Story configuration ready!');
  console.log('\nTo apply this story to your Devvit app:');
  console.log('1. Start your dev environment: npx devvit dev');
  console.log('2. Use the Redis operations in your app to store this story');
  console.log('3. The story will be available at key: story:current');
  
  return story;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initFirstStory().catch(console.error);
}

export { initFirstStory };