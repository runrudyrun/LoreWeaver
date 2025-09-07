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
}

export interface ShardSummary {
  id: string;
  preview: string;
  authorName: string;
  votes: number;
  createdAtISO: string;
  hasChildren: boolean;
}

export interface RealtimeEvent {
  type: 'shardCreated' | 'voteUpdated';
  payload: any;
}