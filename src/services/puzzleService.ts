import { ANSWERS } from '../data/answers';
import { dayIndexForDate, selectPuzzle } from '../game/selection';
import { decodeAnswer } from '../game/puzzleCodec';
import type { DailyPuzzle } from '../game/types';
import { PUZZLE_API_URL } from '../config/env';

export type PuzzleSource = 'network' | 'local';

export interface ResolvedPuzzle {
  puzzle: DailyPuzzle;
  source: PuzzleSource;
}

interface WirePuzzle {
  date: string;
  dayIndex: number;
  number: number;
  category: string;
  clue: string;
  /** The answer, obfuscated — see src/game/puzzleCodec.ts. */
  a: string;
}

const TIMEOUT_MS = 4000;

/**
 * The same deterministic selection the Worker runs, executed on device.
 *
 * This is not a placeholder for the network call: it is the mechanism that lets
 * the game work on a plane, on a first launch with no signal, and on the day a
 * Worker deploy goes wrong. Both sides read the identical generated list in the
 * identical order (see scripts/build-answers.mjs), so they agree on the answer.
 */
export function localPuzzleFor(date: string): DailyPuzzle {
  const dayIndex = dayIndexForDate(date);
  const entry = selectPuzzle(dayIndex, ANSWERS);
  return { ...entry, date, dayIndex, number: dayIndex + 1 };
}

function parseWire(payload: unknown, date: string): DailyPuzzle | null {
  const p = payload as Partial<WirePuzzle> | null;
  if (!p || typeof p !== 'object') return null;
  if (p.date !== date || typeof p.a !== 'string') return null;
  if (typeof p.category !== 'string' || typeof p.clue !== 'string') return null;
  if (typeof p.dayIndex !== 'number' || typeof p.number !== 'number') return null;

  let word: string;
  try {
    word = decodeAnswer(p.a);
  } catch {
    return null;
  }
  if (!/^[A-Z]{4,7}$/.test(word)) return null;

  return {
    word,
    category: p.category,
    clue: p.clue,
    date,
    dayIndex: p.dayIndex,
    number: p.number,
  };
}

/**
 * Today's puzzle, from the Worker where possible and from the bundled list
 * otherwise. Never rejects: a puzzle is always returned, and the caller is told
 * which source produced it.
 */
export async function resolvePuzzle(date: string): Promise<ResolvedPuzzle> {
  if (!PUZZLE_API_URL) return { puzzle: localPuzzleFor(date), source: 'local' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${PUZZLE_API_URL}/puzzle/${date}`, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = parseWire(await response.json(), date);
    if (!parsed) throw new Error('unusable payload');
    return { puzzle: parsed, source: 'network' };
  } catch (error) {
    console.warn(`[Puzzle] Falling back to the bundled list for ${date}:`, error);
    return { puzzle: localPuzzleFor(date), source: 'local' };
  } finally {
    clearTimeout(timer);
  }
}
