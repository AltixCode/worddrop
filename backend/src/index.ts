import answers from './answers.json';
import {
  dayIndexForDate,
  encodeAnswer,
  selectPuzzle,
  todayUTC,
  type PuzzleEntry,
} from './selection';

export interface Env {
  PUZZLES: KVNamespace;
  MAX_PAST_DAYS: string;
}

const LIST = answers as PuzzleEntry[];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface PublishedPuzzle {
  date: string;
  dayIndex: number;
  number: number;
  category: string;
  clue: string;
  /** The answer, obfuscated. See selection.ts. */
  a: string;
}

/** Pure: the same date always produces the same puzzle, on any run. */
function buildPuzzle(date: string): PublishedPuzzle {
  const dayIndex = dayIndexForDate(date);
  const entry = selectPuzzle(dayIndex, LIST);
  return {
    date,
    dayIndex,
    number: dayIndex + 1,
    category: entry.category,
    clue: entry.clue,
    a: encodeAnswer(entry.word),
  };
}

const json = (body: unknown, status = 200, cacheSeconds = 0): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      // A published puzzle never changes, so it is safe to cache hard. Today's
      // is capped at an hour so a corrected entry reaches players the same day.
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  });

/**
 * Writes the puzzle for `date` into KV if it is not already there.
 *
 * Stored rather than computed on every read so that a later edit to the word
 * list cannot retroactively change a day people have already played — the
 * stored record is the published one.
 */
async function publish(env: Env, date: string): Promise<PublishedPuzzle> {
  const key = `puzzle:${date}`;
  const existing = await env.PUZZLES.get<PublishedPuzzle>(key, 'json');
  if (existing) return existing;
  const puzzle = buildPuzzle(date);
  await env.PUZZLES.put(key, JSON.stringify(puzzle));
  return puzzle;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': 'accept',
        },
      });
    }
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

    if (url.pathname === '/health') {
      return json({ ok: true, answers: LIST.length, today: todayUTC() });
    }

    const match = /^\/puzzle\/(today|\d{4}-\d{2}-\d{2})$/.exec(url.pathname);
    if (!match) return json({ error: 'not_found' }, 404);

    const today = todayUTC();
    const date = match[1] === 'today' ? today : match[1];
    if (!DATE_RE.test(date)) return json({ error: 'bad_date' }, 400);

    // A date can be well-formed and still impossible — 2026-02-30 matches the
    // pattern above. Parsing decides, and a parse failure is the client's
    // mistake (400), not ours (a 500 with a stack trace, which is what an
    // unguarded call produced).
    let requestedIndex: number;
    try {
      requestedIndex = dayIndexForDate(date);
    } catch {
      return json({ error: 'bad_date' }, 400);
    }

    const todayIndex = dayIndexForDate(today);

    // Nothing may read forward. Without this the whole future list is one
    // request away and every daily puzzle is spoiled in advance.
    if (requestedIndex > todayIndex) return json({ error: 'not_yet_published' }, 403);
    if (requestedIndex < 0) return json({ error: 'before_launch' }, 404);
    if (todayIndex - requestedIndex > Number(env.MAX_PAST_DAYS ?? 3650)) {
      return json({ error: 'too_old' }, 404);
    }

    const puzzle = await publish(env, date);
    return json(puzzle, 200, date === today ? 3600 : 604800);
  },

  /** Publishes the day's puzzle at UTC midnight. Idempotent by construction. */
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const date = todayUTC();
    const puzzle = await publish(env, date);
    console.log(`published ${date} (#${puzzle.number})`);
  },
};
