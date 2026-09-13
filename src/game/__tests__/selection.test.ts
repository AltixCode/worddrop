import {
  EPOCH_DATE,
  dayIndexForDate,
  dateForDayIndex,
  localDateString,
  selectPuzzle,
  puzzleNumberForDate,
} from '../selection';
import type { PuzzleEntry } from '../types';

const list: PuzzleEntry[] = Array.from({ length: 11 }, (_, i) => ({
  word: `WORD${i}`,
  category: 'test',
  clue: `clue ${i}`,
}));

describe('dayIndexForDate', () => {
  it('is zero on the epoch itself', () => {
    expect(dayIndexForDate(EPOCH_DATE)).toBe(0);
  });

  it('counts whole days forward', () => {
    expect(dayIndexForDate('2026-01-02')).toBe(1);
    expect(dayIndexForDate('2026-02-01')).toBe(31);
  });

  it('crosses a leap day correctly', () => {
    // 2028 is a leap year: Feb 29 exists and March 1 is one day later.
    expect(dayIndexForDate('2028-03-01') - dayIndexForDate('2028-02-29')).toBe(1);
  });

  it('is negative before the epoch rather than throwing', () => {
    expect(dayIndexForDate('2025-12-31')).toBe(-1);
  });

  it('round-trips through dateForDayIndex', () => {
    for (const date of ['2026-01-01', '2026-06-15', '2027-12-31', '2028-02-29']) {
      expect(dateForDayIndex(dayIndexForDate(date))).toBe(date);
    }
  });

  it('rejects a malformed date', () => {
    expect(() => dayIndexForDate('15/06/2026')).toThrow();
    expect(() => dayIndexForDate('2026-13-01')).toThrow();
  });
});

describe('localDateString', () => {
  // A player's "today" is their own calendar day, never UTC. Two devices an
  // hour apart across midnight must therefore see different date strings.
  it('reads the local calendar fields, not the UTC ones', () => {
    const d = new Date(2026, 0, 5, 23, 30, 0); // local 2026-01-05 23:30
    expect(localDateString(d)).toBe('2026-01-05');
  });

  it('zero-pads month and day', () => {
    expect(localDateString(new Date(2026, 8, 9, 12, 0, 0))).toBe('2026-09-09');
  });

  it('rolls over at local midnight', () => {
    const before = new Date(2026, 2, 14, 23, 59, 59);
    const after = new Date(2026, 2, 15, 0, 0, 1);
    expect(localDateString(before)).toBe('2026-03-14');
    expect(localDateString(after)).toBe('2026-03-15');
  });
});

describe('selectPuzzle', () => {
  it('returns the same entry for the same day index', () => {
    expect(selectPuzzle(42, list)).toEqual(selectPuzzle(42, list));
  });

  it('never repeats an entry within one full cycle', () => {
    const seen = new Set(
      Array.from({ length: list.length }, (_, i) => selectPuzzle(i, list).word),
    );
    expect(seen.size).toBe(list.length);
  });

  it('wraps around after a full cycle', () => {
    expect(selectPuzzle(list.length, list)).toEqual(selectPuzzle(0, list));
  });

  it('handles day indexes before the epoch without crashing', () => {
    expect(selectPuzzle(-3, list).word).toBeDefined();
  });

  it('refuses an empty list rather than returning undefined', () => {
    expect(() => selectPuzzle(0, [])).toThrow();
  });
});

describe('puzzleNumberForDate', () => {
  it('numbers the epoch puzzle as #1, for human-readable share text', () => {
    expect(puzzleNumberForDate(EPOCH_DATE)).toBe(1);
    expect(puzzleNumberForDate('2026-01-10')).toBe(10);
  });
});
