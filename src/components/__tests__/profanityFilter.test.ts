import { containsProfanity, filterMessage } from '../../utils/profanityFilter';

describe('Profanity Filter', () => {
  describe('containsProfanity', () => {
    it('detects basic profanity', () => {
      expect(containsProfanity('what the fuck')).toBe(true);
      expect(containsProfanity('you are a shit player')).toBe(true);
    });

    it('detects case-insensitive profanity', () => {
      expect(containsProfanity('DAMN this level')).toBe(true);
      expect(containsProfanity('What the HELL')).toBe(true);
    });

    it('does not flag clean messages', () => {
      expect(containsProfanity('great game!')).toBe(false);
      expect(containsProfanity('nice combo')).toBe(false);
      expect(containsProfanity('good job team')).toBe(false);
    });

    it('avoids false positives with word boundaries', () => {
      expect(containsProfanity('assume nothing')).toBe(false);
      expect(containsProfanity('class is starting')).toBe(false);
      expect(containsProfanity('grassy field')).toBe(false);
      expect(containsProfanity('hello world')).toBe(false);
    });

    it('detects common letter substitutions', () => {
      expect(containsProfanity('what the $hit')).toBe(true);
      expect(containsProfanity('sh1t')).toBe(true);
      expect(containsProfanity('b1tch')).toBe(true);
    });
  });

  describe('filterMessage', () => {
    it('replaces profane words with asterisks', () => {
      const result = filterMessage('what the fuck');
      expect(result).toContain('****');
      expect(result).not.toContain('fuck');
    });

    it('preserves clean words', () => {
      const result = filterMessage('good damn game');
      expect(result).toContain('good');
      expect(result).toContain('game');
    });

    it('handles messages with no profanity', () => {
      expect(filterMessage('hello world')).toBe('hello world');
      expect(filterMessage('great combo!')).toBe('great combo!');
    });

    it('handles empty string', () => {
      expect(filterMessage('')).toBe('');
    });

    it('handles multiple profane words', () => {
      const result = filterMessage('shit and damn');
      expect(result).not.toContain('shit');
      expect(result).not.toContain('damn');
    });
  });
});
