import { validateShardText, normalizeText, calculateNoveltyScore, calculateDiversityScore } from '../validation';
import { RuleCard } from '../types';

describe('Validation', () => {
  const mockRuleCard: RuleCard = {
    bannedWords: ['suddenly', 'then', 'just'],
    requiredTags: ['compass', 'key', 'note'],
    styleTag: 'noir-reportage'
  };

  describe('validateShardText', () => {
    it('should validate valid text', () => {
      const text = 'The compass pointed north as I held the key. The note was clear: follow the path. This story continues with mystery beyond the initial discovery. The ancient compass had been passed down through generations, its needle always pointing toward truth rather than mere magnetic north.';
      const result = validateShardText(text, mockRuleCard);
      
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject text with banned words', () => {
      const text = 'Suddenly, the compass spun wildly. I then realized something was wrong. It was just too quiet.';
      const result = validateShardText(text, mockRuleCard);
      
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('banned word'))).toBe(true);
    });

    it('should reject text without required tags', () => {
      const text = 'The story continues without any of the required elements. It is a tale of mystery and adventure through unknown lands. The journey takes us through dark forests and over towering mountains where ancient secrets lie buried beneath centuries of fallen leaves and weathered stone.';
      const result = validateShardText(text, mockRuleCard);
      
      expect(result.valid).toBe(false);  // This should be false (invalid)
      expect(result.violations.some(v => v.includes('Must include one of'))).toBe(true);
    });

    it('should reject text that is too short', () => {
      const text = 'The compass pointed.';
      const result = validateShardText(text, mockRuleCard);
      
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('200 characters'))).toBe(true);
    });

    it('should reject text that is too long', () => {
      const text = 'A'.repeat(350);
      const result = validateShardText(text, mockRuleCard);
      
      expect(result.valid).toBe(false);
      expect(result.violations.some(v => v.includes('300 characters'))).toBe(true);
    });
  });

  describe('normalizeText', () => {
    it('should normalize text to lowercase and remove punctuation', () => {
      const text = 'Hello, World! How are you?';
      const result = normalizeText(text);
      
      expect(result).toBe('hello world how are you');
    });
  });

  describe('calculateNoveltyScore', () => {
    it('should calculate novelty for unique texts', () => {
      const texts = [
        'The compass pointed north',
        'The key unlocked the door',
        'The note revealed secrets'
      ];
      const score = calculateNoveltyScore(texts);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });

  describe('calculateDiversityScore', () => {
    it('should calculate diversity for multiple authors', () => {
      const authors = ['user1', 'user2', 'user1', 'user3'];
      const score = calculateDiversityScore(authors);
      
      expect(score).toBe(0.75); // 3 unique authors / 4 total
    });

    it('should return 1 for all unique authors', () => {
      const authors = ['user1', 'user2', 'user3'];
      const score = calculateDiversityScore(authors);
      
      expect(score).toBe(1);
    });
  });
});