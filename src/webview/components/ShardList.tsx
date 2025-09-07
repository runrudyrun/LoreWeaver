import React from 'react';
import { ShardSummary } from '../types';

interface ShardListProps {
  shards: ShardSummary[];
  selectedShard: string | null;
  onSelectShard: (shardId: string | null) => void;
  onVote: (shardId: string, direction: 1 | -1) => void;
}

export function ShardList({ shards, selectedShard, onSelectShard, onVote }: ShardListProps) {
  if (shards.length === 0) {
    return (
      <div className="shard-list">
        <div className="empty-state">
          <h3>No shards yet</h3>
          <p>Be the first to contribute to this story!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shard-list">
      {shards.map(shard => (
        <div
          key={shard.id}
          className={`shard-item ${selectedShard === shard.id ? 'selected' : ''}`}
          onClick={() => onSelectShard(shard.id)}
        >
          <div className="shard-header">
            <div className="shard-author">@{shard.authorName}</div>
            <div className="shard-votes">
              {shard.votes} votes
              <button
                className="vote-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(shard.id, 1);
                }}
              >
                👍
              </button>
              <button
                className="vote-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(shard.id, -1);
                }}
              >
                👎
              </button>
            </div>
          </div>
          
          <div className="shard-preview">{shard.preview}</div>
          
          <div className="shard-actions">
            <button
              className="continue-button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectShard(shard.id);
              }}
            >
              Continue here
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}