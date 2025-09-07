import { RuleCard } from '../types';

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export function validateShardText(text: string, ruleCard: RuleCard): ValidationResult {
  const violations: string[] = [];
  const normalizedText = normalizeText(text);
  
  // Check banned words
  for (const bannedWord of ruleCard.bannedWords) {
    if (normalizedText.includes(normalizeText(bannedWord))) {
      violations.push(`Contains banned word: "${bannedWord}"`);
    }
  }
  
  // Check required tags
  const hasRequiredTag = ruleCard.requiredTags.some(tag => 
    normalizedText.includes(normalizeText(tag))
  );
  if (ruleCard.requiredTags.length > 0 && !hasRequiredTag) {
    violations.push(`Must include one of: ${ruleCard.requiredTags.join(', ')}`);
  }
  
  // Check length constraints
  if (text.length < 200) {
    violations.push('Text must be at least 200 characters');
  }
  if (text.length > 300) {
    violations.push('Text must be no more than 300 characters');
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}