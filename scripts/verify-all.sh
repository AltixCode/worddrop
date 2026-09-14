#!/usr/bin/env bash
# Every check that can run without a device, in the order a failure is cheapest
# to read. This is gates 1–2 of docs/agents/11-delivery-playbook.md §15.4 — it
# proves the graph resolves and the logic is sound. It does NOT prove the app
# launches; only gates 3–6 on a real simulator and emulator do that.
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }

step 'TypeScript'
npm run typecheck

step 'Unit tests'
npm test -- --ci

step 'i18n completeness'
node scripts/check-i18n.mjs

step 'UI rules (colour tokens, t(), NativeWind no-ops)'
node scripts/check-ui-rules.mjs

step 'Generated data is up to date'
node scripts/build-answers.mjs
git diff --exit-code -- src/data/answers.ts backend/src/answers.json

step 'Expo configuration'
npx expo config --type public >/dev/null

step 'iOS bundle'
npx expo export --platform ios --output-dir "${TMPDIR:-/tmp}/worddrop-verify-ios" >/dev/null

step 'Android bundle'
npx expo export --platform android --output-dir "${TMPDIR:-/tmp}/worddrop-verify-android" >/dev/null

step 'Worker typecheck and client parity'
(cd backend && npm run typecheck && npm test)

printf '\n\033[32mAll device-free checks passed.\033[0m\n'
printf 'Still UNKNOWN until run on hardware: launch, core flow, purchases, ads.\n'
