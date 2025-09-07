#!/usr/bin/env node

/**
 * Initialize the first story for LoreWeaver
 * Usage: npx devvit dev (to start development environment)
 *        Then manually create the story through the app interface
 */

console.log('🧵 LoreWeaver First Story Initialization');
console.log('==========================================\n');

console.log('📖 To create your first story:');
console.log('');
console.log('1. Start the Devvit development environment:');
console.log('   npx devvit dev');
console.log('');
console.log('2. The app will start in development mode');
console.log('3. Create the first story through the web interface');
console.log('4. Or use the Devvit Reddit app to post the first chapter');
console.log('');
console.log('🎯 Default Story Settings:');
console.log('   - Subreddit: lorecolab_dev');
console.log('   - Chapter ends daily at 23:50 BRT');
console.log('   - Shards: 200-300 characters');
console.log('   - Rate limit: 2 shards per hour per user');
console.log('');
console.log('🎨 Sample RuleCard for first story:');
console.log('   Banned words: ["dragon", "magic", "wizard", "spell"]');
console.log('   Required tags: ["#mystery", "#discovery", "#twist"]');
console.log('   Style: noir');
console.log('');
console.log('✨ Ready to weave some lore!');

// Provide guidance for manual story creation
const sampleStoryData = {
  id: `story_${Date.now()}`,
  chapter: 1,
  title: "The First Thread",
  ruleCard: {
    bannedWords: ["dragon", "magic", "wizard", "spell"],
    requiredTags: ["#mystery", "#discovery", "#twist"],
    styleTag: "noir"
  },
  endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  subreddit: "lorecolab_dev"
};

console.log('\n📋 Sample story data structure:');
console.log(JSON.stringify(sampleStoryData, null, 2));
console.log('\n💡 This will be stored in Redis with key: story:current');