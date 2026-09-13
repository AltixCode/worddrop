import type { LetterState, PlayedGuess } from './types';

/**
 * Wordle-style feedback for `guess` against `answer`.
 *
 * Two passes, because one pass cannot handle repeated letters: a guess letter
 * may only be credited as many times as it actually occurs in the answer, and
 * an exact positional match must always win that credit over an earlier
 * misplaced copy. Getting this wrong is the classic defect of the genre —
 * guessing EERIE against THEME must light exactly one E as present and the
 * final E as correct, never three yellows.
 */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const g = guess.trim().toUpperCase();
  const a = answer.trim().toUpperCase();

  if (g.length === 0) throw new Error('evaluateGuess: empty guess');
  if (g.length !== a.length) {
    throw new Error(
      `evaluateGuess: guess length ${g.length} does not match answer length ${a.length}`,
    );
  }

  const states: LetterState[] = new Array(g.length).fill('absent');
  const remaining = new Map<string, number>();

  // Pass 1 — exact positions, consuming the answer letter they matched.
  for (let i = 0; i < g.length; i += 1) {
    if (g[i] === a[i]) {
      states[i] = 'correct';
    } else {
      remaining.set(a[i], (remaining.get(a[i]) ?? 0) + 1);
    }
  }

  // Pass 2 — misplaced letters, only while an unmatched copy is still available.
  for (let i = 0; i < g.length; i += 1) {
    if (states[i] === 'correct') continue;
    const left = remaining.get(g[i]) ?? 0;
    if (left > 0) {
      states[i] = 'present';
      remaining.set(g[i], left - 1);
    }
  }

  return states;
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/**
 * The keyboard's per-letter colouring: the strongest thing learned about each
 * letter so far. A letter proven correct must never fall back to present or
 * absent because a later guess placed it elsewhere.
 */
export function mergeKeyboardStates(
  played: PlayedGuess[],
): Record<string, LetterState> {
  const map: Record<string, LetterState> = {};
  for (const { guess, states } of played) {
    const letters = guess.toUpperCase();
    for (let i = 0; i < letters.length; i += 1) {
      const letter = letters[i];
      const next = states[i];
      if (!next) continue;
      const current = map[letter];
      if (current === undefined || RANK[next] > RANK[current]) map[letter] = next;
    }
  }
  return map;
}

/** True when every letter of the guess landed in the right place. */
export const isWinningGuess = (states: LetterState[]): boolean =>
  states.length > 0 && states.every((s) => s === 'correct');
