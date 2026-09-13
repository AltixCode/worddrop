import { isValidGuess } from '../dictionary';
import { ANSWERS } from '../../data/answers';
import { ALLOWED_GUESSES } from '../../data/allowedGuesses';

describe('the shipped word data', () => {
  it('carries at least 500 daily answers', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(500);
  });

  it('holds no duplicate answers', () => {
    const words = ANSWERS.map((a) => a.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('holds only A–Z words of a supported length', () => {
    for (const entry of ANSWERS) {
      expect(entry.word).toMatch(/^[A-Z]{4,7}$/);
      expect(entry.clue.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
    }
  });

  it('accepts every answer as a legal guess', () => {
    for (const entry of ANSWERS) {
      expect(isValidGuess(entry.word, entry.word.length)).toBe(true);
    }
  });
});

describe('isValidGuess', () => {
  it('accepts an ordinary dictionary word of the right length', () => {
    expect(isValidGuess('CRANE', 5)).toBe(true);
  });

  it('rejects a word of the wrong length', () => {
    expect(isValidGuess('CRANE', 6)).toBe(false);
  });

  it('rejects letter soup', () => {
    expect(isValidGuess('ZXQJV', 5)).toBe(false);
  });

  it('rejects anything that is not plain A–Z', () => {
    expect(isValidGuess('CRAN3', 5)).toBe(false);
    expect(isValidGuess('CR ANE', 5)).toBe(false);
    expect(isValidGuess('', 5)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isValidGuess('crane', 5)).toBe(true);
  });
});
