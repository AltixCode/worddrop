/**
 * The Worker and the app each carry their own copy of the selection and codec
 * logic — the app must be able to derive the day's puzzle with no network at
 * all, and the Worker cannot import from the Expo bundle. This test is what
 * stops the two copies drifting: if they ever disagree, a player who went
 * offline mid-week would be handed a different word from everyone else.
 *
 * Run: node --test  (from backend/)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backend = path.join(here, '..');
const appRoot = path.join(backend, '..');

const read = (p) => fs.readFileSync(p, 'utf8');

test('the two answer lists are identical', () => {
  const workerList = JSON.parse(read(path.join(backend, 'src/answers.json')));
  const appSource = read(path.join(appRoot, 'src/data/answers.ts'));
  const start = appSource.indexOf('= [') + 2;
  const appList = JSON.parse(appSource.slice(start, appSource.lastIndexOf('];') + 1));
  assert.deepEqual(workerList, appList);
  assert.ok(workerList.length >= 500);
});

test('the selection constants match', () => {
  const worker = read(path.join(backend, 'src/selection.ts'));
  const app = read(path.join(appRoot, 'src/game/selection.ts'));
  for (const needle of ["EPOCH_DATE = '2026-01-01'", 'STRIDE = 257']) {
    assert.ok(worker.includes(needle), `worker missing ${needle}`);
    assert.ok(app.includes(needle), `app missing ${needle}`);
  }
});

test('the codec key matches', () => {
  const worker = read(path.join(backend, 'src/selection.ts'));
  const app = read(path.join(appRoot, 'src/game/puzzleCodec.ts'));
  const key = '[0x57, 0x44, 0x72, 0x6f, 0x70]';
  assert.ok(worker.includes(key));
  assert.ok(app.includes(key));
});
