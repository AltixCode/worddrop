import { encodeAnswer } from '../../game/puzzleCodec';

jest.mock('../../config/env', () => ({
  PUZZLE_API_URL: 'https://puzzles.example.test',
  BANNER_AD_UNIT_ID: 'test',
  INTERSTITIAL_AD_UNIT_ID: 'test',
  USING_TEST_ADS: true,
}));

// Imported after the mock so the module reads the stubbed URL.
const { resolvePuzzle, localPuzzleFor } = require('../puzzleService');

const DATE = '2026-04-07';
const original = global.fetch;
const warn = console.warn;

beforeEach(() => {
  console.warn = jest.fn();
});

afterEach(() => {
  global.fetch = original;
  console.warn = warn;
});

const wire = (overrides: Record<string, unknown> = {}) => {
  const local = localPuzzleFor(DATE);
  return {
    date: DATE,
    dayIndex: local.dayIndex,
    number: local.number,
    category: local.category,
    clue: local.clue,
    a: encodeAnswer(local.word),
    ...overrides,
  };
};

const respondWith = (body: unknown, ok = true, status = 200) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
};

describe('localPuzzleFor', () => {
  it('is deterministic for a date', () => {
    expect(localPuzzleFor(DATE)).toEqual(localPuzzleFor(DATE));
  });

  it('returns a usable board', () => {
    const puzzle = localPuzzleFor(DATE);
    expect(puzzle.word).toMatch(/^[A-Z]{4,7}$/);
    expect(puzzle.category.length).toBeGreaterThan(0);
    expect(puzzle.clue.length).toBeGreaterThan(0);
    expect(puzzle.number).toBe(puzzle.dayIndex + 1);
  });
});

describe('resolvePuzzle', () => {
  it('uses the served puzzle when the request succeeds', async () => {
    respondWith(wire());
    const { puzzle, source } = await resolvePuzzle(DATE);
    expect(source).toBe('network');
    expect(puzzle.word).toBe(localPuzzleFor(DATE).word);
  });

  // Every failure below must still produce a playable board: a player with no
  // signal, or a Worker mid-deploy, still gets today's puzzle.
  it('falls back to the bundled list on a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    const { puzzle, source } = await resolvePuzzle(DATE);
    expect(source).toBe('local');
    expect(puzzle).toEqual(localPuzzleFor(DATE));
  });

  it('falls back on a non-2xx response', async () => {
    respondWith({}, false, 503);
    expect((await resolvePuzzle(DATE)).source).toBe('local');
  });

  it('falls back when the payload is for another date', async () => {
    respondWith(wire({ date: '2026-04-08' }));
    expect((await resolvePuzzle(DATE)).source).toBe('local');
  });

  it('falls back when the answer cannot be decoded', async () => {
    respondWith(wire({ a: 'not base64 !!' }));
    expect((await resolvePuzzle(DATE)).source).toBe('local');
  });

  it('falls back when the decoded answer is not a usable word', async () => {
    respondWith(wire({ a: encodeAnswer('AB') }));
    expect((await resolvePuzzle(DATE)).source).toBe('local');
  });

  it('falls back when fields are missing', async () => {
    respondWith({ date: DATE });
    expect((await resolvePuzzle(DATE)).source).toBe('local');
  });

  it('never rejects', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('thrown synchronously');
    }) as unknown as typeof fetch;
    await expect(resolvePuzzle(DATE)).resolves.toBeDefined();
  });
});
