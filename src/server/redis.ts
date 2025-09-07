import { RedisClient } from '@devvit/public-api';
import { Story, Shard, RuleCard, ShardSummary } from './types';

export class RedisWrapper {
  constructor(private redis: RedisClient) {}

  async getCurrentStory(): Promise<Story | null> {
    const data = await this.redis.get('story:current');
    return data ? JSON.parse(data) : null;
  }

  async setCurrentStory(story: Story): Promise<void> {
    await this.redis.set('story:current', JSON.stringify(story));
  }

  async getStoryMeta(storyId: string): Promise<any> {
    const data = await this.redis.get(`story:${storyId}:meta`);
    return data ? JSON.parse(data) : null;
  }

  async setStoryMeta(storyId: string, meta: any): Promise<void> {
    await this.redis.set(`story:${storyId}:meta`, JSON.stringify(meta));
  }

  async getStoryRule(storyId: string): Promise<RuleCard | null> {
    const data = await this.redis.get(`story:${storyId}:rule`);
    return data ? JSON.parse(data) : null;
  }

  async setStoryRule(storyId: string, rule: RuleCard): Promise<void> {
    await this.redis.set(`story:${storyId}:rule`, JSON.stringify(rule));
  }

  async getShard(shardId: string): Promise<Shard | null> {
    const data = await this.redis.get(`shard:${shardId}`);
    return data ? JSON.parse(data) : null;
  }

  async setShard(shard: Shard): Promise<void> {
    await this.redis.set(`shard:${shard.id}`, JSON.stringify(shard));
  }

  async getShardChildren(shardId: string): Promise<string[]> {
    const data = await this.redis.get(`shard:${shardId}:children`);
    return data ? JSON.parse(data) : [];
  }

  async addShardChild(parentId: string, childId: string): Promise<void> {
    const children = await this.getShardChildren(parentId);
    if (!children.includes(childId)) {
      children.push(childId);
      await this.redis.set(`shard:${parentId}:children`, JSON.stringify(children));
    }
  }

  async incrementShardVotes(shardId: string, delta: number): Promise<number> {
    const shard = await this.getShard(shardId);
    if (!shard) return 0;
    
    shard.votes += delta;
    await this.setShard(shard);
    
    return shard.votes;
  }

  async addShardToStoryByVotes(storyId: string, shardId: string, votes: number): Promise<void> {
    await this.redis.zAdd(`story:${storyId}:byVotes`, { member: shardId, score: votes });
  }

  async addShardToStoryByTime(storyId: string, shardId: string, timestamp: number): Promise<void> {
    await this.redis.zAdd(`story:${storyId}:byTime`, { member: shardId, score: timestamp });
  }

  async getShardsByVotes(storyId: string, start: number = 0, end: number = 19): Promise<string[]> {
    const result = await this.redis.zRange(`story:${storyId}:byVotes`, start, end);
    return result.reverse().map((r: any) => r.member);
  }

  async getShardsByTime(storyId: string, start: number = 0, end: number = 19): Promise<string[]> {
    const result = await this.redis.zRange(`story:${storyId}:byTime`, start, end);
    return result.reverse().map((r: any) => r.member);
  }

  async getUserRateCount(userName: string, date: string): Promise<number> {
    const key = `user:${userName}:rate:${date}`;
    const count = await this.redis.get(key);
    return count ? parseInt(count) : 0;
  }

  async incrementUserRateCount(userName: string, date: string): Promise<number> {
    const key = `user:${userName}:rate:${date}`;
    const current = await this.getUserRateCount(userName, date);
    const newCount = current + 1;
    await this.redis.set(key, newCount.toString());
    
    // Set TTL to 25 hours to ensure it expires after the day
    await this.redis.expire(key, 25 * 60 * 60);
    
    return newCount;
  }

  async hideShard(shardId: string, hidden: boolean): Promise<void> {
    const shard = await this.getShard(shardId);
    if (shard) {
      shard.hidden = hidden;
      await this.setShard(shard);
    }
  }

  async freezeShard(shardId: string, frozen: boolean): Promise<void> {
    const shard = await this.getShard(shardId);
    if (shard) {
      shard.frozen = frozen;
      await this.setShard(shard);
    }
  }

  async getAllShardsInStory(storyId: string): Promise<Shard[]> {
    const shardIds = await this.getShardsByTime(storyId, 0, -1);
    const shards: Shard[] = [];
    
    for (const shardId of shardIds) {
      const shard = await this.getShard(shardId);
      if (shard) shards.push(shard);
    }
    
    return shards;
  }
}