export interface RuleCard {
  bannedWords: string[];
  requiredTags: string[];
  styleTag: string;
}

export interface Story {
  id: string;
  chapter: number;
  ruleCard: RuleCard;
  endsAtISO: string;
  title: string;
  createdAtISO: string;
  subreddit: string;
  authorName: string;
  rootShardId?: string;
}

export interface Shard {
  id: string;
  storyId: string;
  parentId?: string;
  text: string;
  authorName: string;
  authorId: string;
  tsISO: string;
  votes: number;
  hidden: boolean;
  frozen: boolean;
  violations: string[];
}

export interface ShardSummary {
  id: string;
  preview: string;
  authorName: string;
  votes: number;
  createdAtISO: string;
  hasChildren: boolean;
}

export interface VoteUpdate {
  shardId: string;
  votes: number;
}

export interface RealtimeEvent {
  type: 'shardCreated' | 'voteUpdated';
  payload: any;
}

export interface CanonizeWeights {
  w1: number;
  w2: number;
  w3: number;
  penalty: number;
}