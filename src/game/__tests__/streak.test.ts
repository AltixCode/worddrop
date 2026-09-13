import { EMPTY_STATS, applyResult, isStreakBroken } from '../streak';

const won = (date: string, attempts: number) => ({ date, won: true, attempts });
const lost = (date: string) => ({ date, won: false, attempts: 6 });

describe('applyResult', () => {
  it('records a first win', () => {
    const s = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    expect(s.played).toBe(1);
    expect(s.wins).toBe(1);
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
    expect(s.distribution[2]).toBe(1);
    expect(s.lastPlayedDate).toBe('2026-03-01');
  });

  it('extends the streak on consecutive local days', () => {
    let s = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    s = applyResult(s, won('2026-03-02', 4));
    s = applyResult(s, won('2026-03-03', 2));
    expect(s.currentStreak).toBe(3);
    expect(s.maxStreak).toBe(3);
  });

  it('restarts the streak at one after a skipped day', () => {
    let s = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    s = applyResult(s, won('2026-03-03', 3));
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(1);
  });

  it('keeps the best streak after it is broken', () => {
    let s = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    s = applyResult(s, won('2026-03-02', 3));
    s = applyResult(s, won('2026-03-05', 3));
    expect(s.currentStreak).toBe(1);
    expect(s.maxStreak).toBe(2);
  });

  it('resets the streak to zero on a loss', () => {
    let s = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    s = applyResult(s, lost('2026-03-02'));
    expect(s.currentStreak).toBe(0);
    expect(s.maxStreak).toBe(1);
    expect(s.played).toBe(2);
    expect(s.wins).toBe(1);
  });

  it('crosses a month and a year boundary', () => {
    let s = applyResult(EMPTY_STATS, won('2026-12-31', 3));
    s = applyResult(s, won('2027-01-01', 3));
    expect(s.currentStreak).toBe(2);
  });

  // Replaying the same day must not inflate the record; the caller may apply a
  // result more than once after a relaunch mid-animation.
  it('is idempotent for a day already recorded', () => {
    const first = applyResult(EMPTY_STATS, won('2026-03-01', 3));
    const second = applyResult(first, won('2026-03-01', 3));
    expect(second).toEqual(first);
  });

  it('ignores a result older than the last recorded day', () => {
    const s = applyResult(EMPTY_STATS, won('2026-03-05', 3));
    expect(applyResult(s, won('2026-03-04', 3))).toEqual(s);
  });

  it('rejects an attempt count outside the board', () => {
    expect(() => applyResult(EMPTY_STATS, won('2026-03-01', 0))).toThrow();
    expect(() => applyResult(EMPTY_STATS, won('2026-03-01', 7))).toThrow();
  });
});

describe('isStreakBroken', () => {
  it('is false on the day itself and on the next day', () => {
    expect(isStreakBroken('2026-03-01', '2026-03-01')).toBe(false);
    expect(isStreakBroken('2026-03-01', '2026-03-02')).toBe(false);
  });

  it('is true once a whole day has been missed', () => {
    expect(isStreakBroken('2026-03-01', '2026-03-03')).toBe(true);
  });

  it('is false when nothing has been played yet', () => {
    expect(isStreakBroken(null, '2026-03-03')).toBe(false);
  });

  // A device clock moved backwards must not silently award a live streak.
  it('is true when the current date precedes the last played date', () => {
    expect(isStreakBroken('2026-03-05', '2026-03-01')).toBe(true);
  });
});
