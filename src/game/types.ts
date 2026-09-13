/** Feedback for one letter of a guess, in the standard three-state scheme. */
export type LetterState = 'correct' | 'present' | 'absent';

/** One curated daily answer, bundled with the app and mirrored by the Worker. */
export interface PuzzleEntry {
  /** Upper-case A–Z, 4–7 letters. */
  word: string;
  /** Short category label shown before the first guess, e.g. "Genre". */
  category: string;
  /** Spoiler-free hint, revealed after the third failed guess. */
  clue: string;
}

/** A puzzle bound to a calendar day. */
export interface DailyPuzzle extends PuzzleEntry {
  /** Local calendar date, `YYYY-MM-DD`. */
  date: string;
  /** Days since the launch epoch. */
  dayIndex: number;
  /** Human-facing puzzle number, `dayIndex + 1`. */
  number: number;
}

/** A guess the player has committed, with its evaluated feedback. */
export interface PlayedGuess {
  guess: string;
  states: LetterState[];
}

export type GameStatus = 'in_progress' | 'won' | 'lost';

export const MAX_ATTEMPTS = 6;
export const MIN_WORD_LENGTH = 4;
export const MAX_WORD_LENGTH = 7;
