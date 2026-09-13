import { MAX_ATTEMPTS } from './types';

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  /** Local date of the most recent completed puzzle, or null. */
  lastPlayedDate: string | null;
  /** Wins by attempt count; index 0 is a one-guess win. */
  distribution: number[];
}

export const EMPTY_STATS: Stats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
  distribution: new Array(MAX_ATTEMPTS).fill(0),
};

export interface GameResult {
  /** Local date the puzzle was completed on. */
  date: string;
  won: boolean;
  /** 1-based guess count; the loss case still reports MAX_ATTEMPTS. */
  attempts: number;
}

const DAY_MS = 86_400_000;
const toUTC = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days between two local date strings. */
const daysBetween = (from: string, to: string): number =>
  Math.round((toUTC(to) - toUTC(from)) / DAY_MS);

/**
 * Folds one finished puzzle into the running record.
 *
 * Pure and idempotent: a result for a day already recorded (or older than it)
 * is ignored rather than counted twice, because the caller may re-apply after a
 * relaunch that interrupted the result animation.
 */
export function applyResult(stats: Stats, result: GameResult): Stats {
  if (!Number.isInteger(result.attempts) || result.attempts < 1 || result.attempts > MAX_ATTEMPTS) {
    throw new Error(`applyResult: attempts ${result.attempts} outside 1..${MAX_ATTEMPTS}`);
  }

  if (stats.lastPlayedDate && daysBetween(stats.lastPlayedDate, result.date) <= 0) {
    return stats;
  }

  const gap = stats.lastPlayedDate ? daysBetween(stats.lastPlayedDate, result.date) : null;
  const continues = gap === 1 && stats.currentStreak > 0;
  const currentStreak = result.won ? (continues ? stats.currentStreak + 1 : 1) : 0;

  const distribution = [...stats.distribution];
  if (result.won) distribution[result.attempts - 1] += 1;

  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastPlayedDate: result.date,
    distribution,
  };
}

/**
 * Whether a streak shown on the home screen is already dead — the player missed
 * a whole day, or moved the device clock backwards past the last recorded day.
 */
export function isStreakBroken(lastPlayedDate: string | null, today: string): boolean {
  if (!lastPlayedDate) return false;
  const gap = daysBetween(lastPlayedDate, today);
  return gap < 0 || gap > 1;
}

export const winPercentage = (stats: Stats): number =>
  stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
