#!/usr/bin/env node
/**
 * Compiles `src/data/answers.source.tsv` into the two artefacts that actually
 * ship: a typed module for the app and a JSON file for the Cloudflare Worker.
 *
 * Both sides must read the identical list in the identical order, or the
 * offline fallback in the client and the published puzzle from the Worker would
 * disagree about what today's word is. Generating both from one source is what
 * makes that impossible rather than merely unlikely.
 *
 * Usage: node scripts/build-answers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'src/data/answers.source.tsv');
const TS_OUT = path.join(root, 'src/data/answers.ts');
const JSON_OUT = path.join(root, 'backend/src/answers.json');

const lines = fs.readFileSync(SOURCE, 'utf8').split('\n');
const entries = [];
const seen = new Set();
const errors = [];

lines.forEach((line, i) => {
  if (!line.trim() || line.startsWith('#')) return;
  const [word, category, clue] = line.split('\t');
  const at = `${path.relative(root, SOURCE)}:${i + 1}`;
  if (!word || !category || !clue) return errors.push(`${at}: expected WORD<TAB>CATEGORY<TAB>CLUE`);
  const w = word.trim().toUpperCase();
  if (!/^[A-Z]{4,7}$/.test(w)) return errors.push(`${at}: "${w}" is not 4–7 letters of A–Z`);
  if (seen.has(w)) return errors.push(`${at}: "${w}" is a duplicate`);
  if (clue.trim().toUpperCase().includes(w)) {
    return errors.push(`${at}: the clue for "${w}" contains the answer`);
  }
  seen.add(w);
  entries.push({ word: w, category: category.trim(), clue: clue.trim() });
});

if (errors.length) {
  console.error(`build-answers: ${errors.length} problem(s)\n${errors.join('\n')}`);
  process.exit(1);
}
if (entries.length < 500) {
  console.error(`build-answers: only ${entries.length} answers; the list must hold at least 500.`);
  process.exit(1);
}

const banner = `// GENERATED FILE — do not edit.
// Source: src/data/answers.source.tsv · Rebuild: node scripts/build-answers.mjs
`;

fs.writeFileSync(
  TS_OUT,
  `${banner}import type { PuzzleEntry } from '../game/types';

export const ANSWERS: PuzzleEntry[] = ${JSON.stringify(entries, null, 2)};

export const ANSWER_WORDS: ReadonlySet<string> = new Set(ANSWERS.map((a) => a.word));
`,
);

fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, `${JSON.stringify(entries, null, 2)}\n`);

const byLength = entries.reduce((acc, e) => {
  acc[e.word.length] = (acc[e.word.length] ?? 0) + 1;
  return acc;
}, {});
console.log(`build-answers: ${entries.length} answers`, byLength);
