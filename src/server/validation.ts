import { RuleCard, Shard } from './types';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it',
  'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but',
  'they', 'have', 'had', 'what', 'said', 'each', 'which', 'she', 'do', 'how', 'their', 'if',
  'up', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like',
  'into', 'him', 'time', 'two', 'more', 'go', 'no', 'way', 'could', 'my', 'than', 'first',
  'been', 'call', 'who', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come',
  'made', 'may', 'part'
]);

export interface ValidationResult {
  valid: boolean;
  violations: string[];
}

export function validateShardText(text: string, ruleCard: RuleCard): ValidationResult {
  const violations: string[] = [];
  const normalizedText = normalizeText(text);
  const words = normalizedText.split(/\s+/);

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

export function calculateNoveltyScore(texts: string[]): number {
  const allWords = new Set<string>();
  const uniqueWords = new Set<string>();
  
  for (const text of texts) {
    const words = normalizeText(text).split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !STOPWORDS.has(word)) {
        if (!allWords.has(word)) {
          uniqueWords.add(word);
        }
        allWords.add(word);
      }
    }
  }
  
  return allWords.size > 0 ? uniqueWords.size / allWords.size : 0;
}

export function calculateDiversityScore(authors: string[]): number {
  const uniqueAuthors = new Set(authors);
  return uniqueAuthors.size / authors.length;
}

export function tokenizeForValidation(text: string): string[] {
  return normalizeText(text).split(/\s+/).filter(w => w.length > 0);
}

export function isProfane(text: string): boolean {
  // Basic profanity check - can be expanded
  const profaneWords = [
    'fuck', 'shit', 'damn', 'bitch', 'asshole', 'cunt', 'nigger', 'fag'
  ];
  
  const normalizedText = normalizeText(text);
  return profaneWords.some(word => normalizedText.includes(word));
}