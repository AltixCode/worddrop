import type { PuzzleEntry } from './types';

/**
 * Day zero of the rotation. Puzzle numbering and the whole selection sequence
 * are derived from it, so it must never change after launch.
 */
export const EPOCH_DATE = '2026-01-01';

const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parses `YYYY-MM-DD` as a UTC midnight timestamp, rejecting anything else. */
function parseDate(iso: string): number {
  const m = DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid date "${iso}", expected YYYY-MM-DD`);
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const ts = Date.UTC(year, month - 1, day);
  const back = new Date(ts);
  // Date.UTC happily rolls 2026-13-01 into 2027-01-01; reject rather than accept
  // a date the caller did not mean.
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${iso}"`);
  }
  return ts;
}

/** Whole days from the epoch to `iso`; negative before launch. */
export function dayIndexForDate(iso: string): number {
  return Math.round((parseDate(iso) - parseDate(EPOCH_DATE)) / DAY_MS);
}

/** The inverse of {@link dayIndexForDate}. */
export function dateForDayIndex(dayIndex: number): string {
  const d = new Date(parseDate(EPOCH_DATE) + dayIndex * DAY_MS);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * The player's own calendar date.
 *
 * Deliberately local, not UTC: the puzzle is published at UTC midnight so that
 * everyone plays the same board, but a player's streak and eligibility follow
 * the day on their own device. Reading UTC here would hand players east of the
 * line a puzzle dated yesterday.
 */
export function localDateString(date: Date = new Date()): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Puzzle #1 is the epoch day; used in the share text. */
export const puzzleNumberForDate = (iso: string): number => dayIndexForDate(iso) + 1;

const STRIDE = 257;

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Deterministic, repeat-free selection.
 *
 * Stepping by a stride coprime with the list length visits every entry exactly
 * once per cycle, so the order is not the file's order — which would let a
 * player who dumped the bundle read off the next month at a glance — while
 * staying a pure function of the day index. Re-running the publisher for a past
 * day therefore always reproduces that day's answer.
 */
export function selectPuzzle(dayIndex: number, list: PuzzleEntry[]): PuzzleEntry {
  if (!list.length) throw new Error('selectPuzzle: empty puzzle list');
  const stride = gcd(STRIDE, list.length) === 1 ? STRIDE : 1;
  // JS % keeps the sign of the dividend, so normalise for pre-epoch indexes.
  const idx = (((dayIndex * stride) % list.length) + list.length) % list.length;
  return list[idx];
}
