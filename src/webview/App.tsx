import React, { useState, useEffect } from 'react';
import { RuleCard } from './components/RuleCard';
import { ShardList } from './components/ShardList';
import { ShardComposer } from './components/ShardComposer';
import { useRealtime } from './lib/realtime';
import { api } from './lib/api';
import { Story, ShardSummary } from './types';

export default function App() {
  const [story, setStory] = useState<Story | null>(null);
  const [shards, setShards] = useState<ShardSummary[]>([]);
  const [selectedShard, setSelectedShard] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'top' | 'recent'>('top');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Initialize realtime connection
  useRealtime(story?.id, (event) => {
    if (event.type === 'shardCreated') {
      // Refresh shards to get new content
      loadShards();
    } else if (event.type === 'voteUpdated') {
      // Update vote count in existing shards
      setShards(prev => prev.map(shard => 
        shard.id === event.payload.shardId 
          ? { ...shard, votes: event.payload.votes }
          : shard
      ));
    }
  });

  useEffect(() => {
    initializeStory();
  }, []);

  useEffect(() => {
    if (story?.endsAtISO) {
      const timer = setInterval(() => {
        const now = new Date();
        const endsAt = new Date(story.endsAtISO);
        const diff = endsAt.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeRemaining('Chapter ending...');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeRemaining(`${hours}h ${minutes}m remaining`);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [story?.endsAtISO]);

  async function initializeStory() {
    try {
      setLoading(true);
      setError(null);
      
      // Get current story
      const result = await api.get('/api/story.state', { 
        storyId: 'current', 
        tab: activeTab,
        limit: 20 
      });
      
      if (result.success) {
        setStory(result.story);
        setShards(result.shards);
      } else {
        setError(result.error || 'Failed to load story');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadShards() {
    if (!story) return;
    
    try {
      const result = await api.get('/api/story.state', { 
        storyId: story.id, 
        tab: activeTab,
        limit: 20 
      });
      
      if (result.success) {
        setShards(result.shards);
      }
    } catch (err) {
      console.error('Failed to load shards:', err);
    }
  }

  async function handleShardCreated() {
    await loadShards();
  }

  async function handleVote(shardId: string, direction: 1 | -1) {
    if (!story) return;
    
    try {
      const result = await api.post('/api/shard.vote', {
        storyId: story.id,
        shardId,
        dir: direction
      });
      
      if (result.success) {
        // Vote will be updated via realtime event
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading LoreWeave...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">{error}</div>
        <button onClick={initializeStory}>Retry</button>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="app">
        <div className="error">No active story found</div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="header">
        <h1 className="title">{story.title}</h1>
        <p className="setup">
          Welcome to LoreWeave! Collaboratively write branching micro-fiction under daily constraints. 
          Each shard must be 200-300 characters and follow the RuleCard below.
        </p>
        <div className="timer">⏰ {timeRemaining}</div>
        
        <RuleCard ruleCard={story.ruleCard} />
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'top' ? 'active' : ''}`}
          onClick={() => setActiveTab('top')}
        >
          Top Shards
        </div>
        <div 
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent Shards
        </div>
      </div>

      <ShardList
        shards={shards}
        selectedShard={selectedShard}
        onSelectShard={setSelectedShard}
        onVote={handleVote}
      />

      <ShardComposer
        storyId={story.id}
        selectedParentId={selectedShard}
        ruleCard={story.ruleCard}
        onShardCreated={handleShardCreated}
      />
    </div>
  );
}