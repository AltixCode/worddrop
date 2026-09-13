import { ALLOWED_GUESSES } from '../data/allowedGuesses';
import { ANSWER_WORDS } from '../data/answers';

/**
 * Lazily-built lookup sets, one per word length.
 *
 * The shipped dictionary is stored as a single concatenated string per length
 * to keep the bundle small; slicing it into a Set costs a few milliseconds and
 * happens on the first guess of a session, not at import time, so it never
 * delays the first frame.
 */
const cache = new Map<number, Set<string>>();

function setFor(length: number): Set<string> {
  const cached = cache.get(length);
  if (cached) return cached;

  const blob = ALLOWED_GUESSES[length] ?? '';
  const set = new Set<string>();
  for (let i = 0; i + length <= blob.length; i += length) {
    set.add(blob.slice(i, i + length));
  }
  // Every curated answer is guessable by definition, including the handful of
  // modern film words that a 1934 word list never contained.
  for (const word of ANSWER_WORDS) {
    if (word.length === length) set.add(word);
  }
  cache.set(length, set);
  return set;
}

/** Whether `word` is a legal guess on a board of `length` letters. */
export function isValidGuess(word: string, length: number): boolean {
  const w = word.trim().toUpperCase();
  if (w.length !== length) return false;
  if (!/^[A-Z]+$/.test(w)) return false;
  return setFor(length).has(w);
}
