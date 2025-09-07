import React from 'react';
import { RuleCard as RuleCardType } from '../types';
import { validateShardText } from '../lib/validation';

interface RuleCardProps {
  ruleCard: RuleCardType;
  currentText?: string;
}

export function RuleCard({ ruleCard, currentText = '' }: RuleCardProps) {
  const validation = currentText ? validateShardText(currentText, ruleCard) : null;
  
  return (
    <div className="rule-card">
      <h3>📋 RuleCard: {ruleCard.styleTag}</h3>
      
      {ruleCard.bannedWords.length > 0 && (
        <div className="rule-item">
          <div className={`rule-status ${validation ? (validation.violations.some(v => v.includes('banned')) ? 'invalid' : 'valid') : ''}`}>
            {validation ? (validation.violations.some(v => v.includes('banned')) ? '✗' : '✓') : '•'}
          </div>
          <div className="rule-text">
            <strong>Banned words:</strong> {ruleCard.bannedWords.join(', ')}
          </div>
        </div>
      )}
      
      {ruleCard.requiredTags.length > 0 && (
        <div className="rule-item">
          <div className={`rule-status ${validation ? (validation.violations.some(v => v.includes('required')) ? 'invalid' : 'valid') : ''}`}>
            {validation ? (validation.violations.some(v => v.includes('required')) ? '✗' : '✓') : '•'}
          </div>
          <div className="rule-text">
            <strong>Required tags:</strong> {ruleCard.requiredTags.join(', ')}
          </div>
        </div>
      )}
      
      <div className="rule-item">
        <div className={`rule-status ${currentText.length >= 200 && currentText.length <= 300 ? 'valid' : 'invalid'}`}>
          {currentText.length >= 200 && currentText.length <= 300 ? '✓' : '✗'}
        </div>
        <div className="rule-text">
          <strong>Length:</strong> {currentText.length}/300 characters (min 200)
        </div>
      </div>
      
      {validation && validation.violations.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Issues:</h4>
          <ul>
            {validation.violations.map((violation, index) => (
              <li key={index}>• {violation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}