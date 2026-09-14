#!/usr/bin/env node
/**
 * Shows which answer lands on which day, using the same deterministic selection
 * the app and the Worker run.
 *
 * Two jobs:
 *  - the content review that must happen before launch (`--all` prints every
 *    answer with its clue, in list order, for a human to read through);
 *  - a spot check that a given date really does produce the word you expect,
 *    which is the first thing to run when a player reports a mismatch.
 *
 * Usage:
 *   node scripts/preview-schedule.mjs                 # next 14 days from today
 *   node scripts/preview-schedule.mjs 2026-06-01 30   # 30 days from a date
 *   node scripts/preview-schedule.mjs --all           # the whole list, for review
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ANSWERS = JSON.parse(fs.readFileSync(path.join(root, 'backend/src/answers.json'), 'utf8'));

// Kept in step with src/game/selection.ts; backend/test/parity.test.mjs is what
// fails the build if these constants ever diverge from the shipped ones.
const EPOCH_DATE = '2026-01-01';
const STRIDE = 257;
const DAY_MS = 86_400_000;

const parse = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Invalid date "${iso}"`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};
const dayIndexForDate = (iso) => Math.round((parse(iso) - parse(EPOCH_DATE)) / DAY_MS);
const dateForDayIndex = (i) => new Date(parse(EPOCH_DATE) + i * DAY_MS).toISOString().slice(0, 10);
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const select = (dayIndex) => {
  const stride = gcd(STRIDE, ANSWERS.length) === 1 ? STRIDE : 1;
  return ANSWERS[(((dayIndex * stride) % ANSWERS.length) + ANSWERS.length) % ANSWERS.length];
};

const args = process.argv.slice(2);

if (args.includes('--all')) {
  console.log(`# WordDrop answer review sheet — ${ANSWERS.length} entries\n`);
  console.log('| # | Word | Category | Clue |');
  console.log('| --- | --- | --- | --- |');
  ANSWERS.forEach((entry, i) => {
    console.log(`| ${i + 1} | ${entry.word} | ${entry.category} | ${entry.clue} |`);
  });
  console.log(
    `\nRead every row: offensive words, ambiguous entries, and clues that give the` +
      ` answer away. Nothing automates this pass.`,
  );
  process.exit(0);
}

const start = args[0] && /^\d{4}-\d{2}-\d{2}$/.test(args[0]) ? args[0] : new Date().toISOString().slice(0, 10);
const count = Number(args.find((a) => /^\d+$/.test(a)) ?? 14);
const startIndex = dayIndexForDate(start);

console.log(`Puzzle schedule from ${start} (${ANSWERS.length} answers, cycle ${ANSWERS.length} days)\n`);
console.log('date        #     word      len  category    clue');
for (let i = 0; i < count; i += 1) {
  const index = startIndex + i;
  const entry = select(index);
  console.log(
    `${dateForDayIndex(index)}  ${String(index + 1).padStart(4)}  ${entry.word.padEnd(9)} ${String(
      entry.word.length,
    ).padStart(3)}  ${entry.category.padEnd(11)} ${entry.clue}`,
  );
}

const repeatsOn = dateForDayIndex(startIndex + ANSWERS.length);
console.log(`\nThe list starts repeating on ${repeatsOn}. Top it up before then — docs/word-list.md.`);
