/**
 * The publisher's copy of the client's selection logic.
 *
 * It must stay byte-for-byte equivalent to `src/game/selection.ts` and
 * `src/game/puzzleCodec.ts` in the app: the client falls back to computing the
 * day's puzzle locally when this Worker is unreachable, and the two must agree.
 * `npm test` in this directory checks that they do.
 */
export const EPOCH_DATE = '2026-01-01';
const DAY_MS = 86_400_000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const STRIDE = 257;

export interface PuzzleEntry {
  word: string;
  category: string;
  clue: string;
}

function parseDate(iso: string): number {
  const m = DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid date "${iso}"`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const ts = Date.UTC(year, month - 1, day);
  const back = new Date(ts);
  if (
    back.getUTCFullYear() !== year ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCDate() !== day
  ) {
    throw new Error(`Invalid date "${iso}"`);
  }
  return ts;
}

export const dayIndexForDate = (iso: string): number =>
  Math.round((parseDate(iso) - parseDate(EPOCH_DATE)) / DAY_MS);

export function todayUTC(now: Date = new Date()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${now.getUTCFullYear()}-${mm}-${dd}`;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function selectPuzzle(dayIndex: number, list: PuzzleEntry[]): PuzzleEntry {
  if (!list.length) throw new Error('selectPuzzle: empty puzzle list');
  const stride = gcd(STRIDE, list.length) === 1 ? STRIDE : 1;
  const idx = (((dayIndex * stride) % list.length) + list.length) % list.length;
  return list[idx];
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const KEY = [0x57, 0x44, 0x72, 0x6f, 0x70];

/** Mirrors the client's codec: light obfuscation, never security. */
export function encodeAnswer(word: string): string {
  const upper = word.trim().toUpperCase();
  if (!/^[A-Z]{1,16}$/.test(upper)) throw new Error(`encodeAnswer: unusable word "${word}"`);
  const bytes = [...upper].map((c, i) => c.charCodeAt(0) ^ KEY[i % KEY.length]);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}
