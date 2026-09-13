#!/usr/bin/env node
/**
 * Compiles the list of words a player is allowed to *guess* (as opposed to the
 * curated list of daily answers) into `src/data/allowedGuesses.ts`.
 *
 * Source: the system word list at /usr/share/dict/words, which on macOS is
 * `web2` — the word list derived from Webster's Second International (1934) and
 * in the public domain. Only entirely lower-case, unaccented A–Z entries are
 * kept, which drops proper nouns and hyphenated forms.
 *
 * Words are stored as one concatenated string per length rather than an array
 * of ~48,000 quoted strings: same data, roughly a third of the bytes in the
 * bundle, and the lookup set is built once on first use.
 *
 * Usage: node scripts/build-dictionary.mjs [path-to-word-list]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = process.argv[2] ?? '/usr/share/dict/words';
const OUT = path.join(root, 'src/data/allowedGuesses.ts');
const MIN = 4;
const MAX = 7;

if (!fs.existsSync(SOURCE)) {
  console.error(
    `build-dictionary: no word list at ${SOURCE}. Pass one explicitly, e.g.\n` +
      '  node scripts/build-dictionary.mjs /usr/share/dict/web2',
  );
  process.exit(1);
}

const buckets = new Map();
for (let n = MIN; n <= MAX; n += 1) buckets.set(n, new Set());

for (const raw of fs.readFileSync(SOURCE, 'utf8').split('\n')) {
  const word = raw.trim();
  if (!/^[a-z]+$/.test(word)) continue;
  const bucket = buckets.get(word.length);
  if (bucket) bucket.add(word.toUpperCase());
}

const counts = {};
let body = '';
for (const [length, set] of buckets) {
  const sorted = [...set].sort();
  counts[length] = sorted.length;
  if (!sorted.length) {
    console.error(`build-dictionary: no ${length}-letter words found in ${SOURCE}`);
    process.exit(1);
  }
  body += `  ${length}: '${sorted.join('')}',\n`;
}

fs.writeFileSync(
  OUT,
  `// GENERATED FILE — do not edit.
// Source: ${SOURCE} (public-domain "web2" word list)
// Rebuild: node scripts/build-dictionary.mjs

/**
 * Guessable words, concatenated per length. Every entry in a bucket is exactly
 * \`length\` characters, so the string is sliced back apart without separators.
 */
export const ALLOWED_GUESSES: Record<number, string> = {
${body}};

export const MIN_GUESS_LENGTH = ${MIN};
export const MAX_GUESS_LENGTH = ${MAX};
`,
);

console.log('build-dictionary:', counts);
