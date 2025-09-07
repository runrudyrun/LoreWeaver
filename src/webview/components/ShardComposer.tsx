import React, { useState, useEffect } from 'react';
import { RuleCard as RuleCardType } from '../types';
import { RuleCard } from './RuleCard';
import { api } from '../lib/api';
import { validateShardText } from '../lib/validation';

interface ShardComposerProps {
  storyId: string;
  selectedParentId: string | null;
  ruleCard: RuleCardType;
  onShardCreated: () => void;
}

export function ShardComposer({ storyId, selectedParentId, ruleCard, onShardCreated }: ShardComposerProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createAsChild, setCreateAsChild] = useState(!!selectedParentId);

  useEffect(() => {
    setCreateAsChild(!!selectedParentId);
  }, [selectedParentId]);

  const validation = validateShardText(text, ruleCard);
  const canSubmit = text.length >= 200 && text.length <= 300 && validation.valid && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!canSubmit) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await api.post('/api/shard.create', {
        storyId,
        parentId: createAsChild ? selectedParentId : null,
        text
      });
      
      if (result.success) {
        setText('');
        onShardCreated();
        
        if (result.violations?.length > 0) {
          setError(`Shard created with warnings: ${result.violations.join(', ')}`);
        }
      } else {
        setError(result.error || 'Failed to create shard');
      }
    } catch (err) {
      setError('Failed to submit shard. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const charCounterClass = 
    text.length > 300 ? 'error' : 
    text.length > 280 ? 'warning' : 
    text.length < 200 ? 'warning' : '';

  return (
    <div className="composer">
      <h3>✍️ Contribute to the Story</h3>
      
      {selectedParentId && (
        <div className="composer-options">
          <div className="composer-option">
            <input
              type="radio"
              id="child"
              checked={createAsChild}
              onChange={() => setCreateAsChild(true)}
            />
            <label htmlFor="child">
              Continue from selected shard
            </label>
          </div>
          <div className="composer-option">
            <input
              type="radio"
              id="root"
              checked={!createAsChild}
              onChange={() => setCreateAsChild(false)}
            />
            <label htmlFor="root">
              Create new root shard
            </label>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error">{error}</div>
      )}
      
      <form onSubmit={handleSubmit}>
        <textarea
          className="composer-textarea"
          placeholder="Write your shard (200-300 characters)..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
          maxLength={350}
        />
        
        <div className="composer-footer">
          <div className={`char-counter ${charCounterClass}`}>
            {text.length}/300 characters
          </div>
          
          <button
            type="submit"
            className="submit-button"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Shard'}
          </button>
        </div>
      </form>
      
      <RuleCard ruleCard={ruleCard} currentText={text} />
    </div>
  );
}