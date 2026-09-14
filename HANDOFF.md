# HANDOFF — WordDrop

**Status: `NOT_READY_FOR_SUBMISSION`** — the app builds and its logic is tested,
but nothing has been launched on a device or an emulator yet, and no store or
service account has been configured. Everything unverified below is recorded as
`UNKNOWN`, never as a pass.

- **Date**: 2026-09-14 (local; scaffolded 2026-09-13)
- **Repository**: https://github.com/atasmohammadi/worddrop (private)
- **Scope of this pass**: full scaffold from
  `02-daily-word-puzzle-implementation-plan.md` — game, backend Worker, ads,
  lifetime unlock, 14 locales, CI/CD and store documentation.

## What was actually run

| Check | Command | Result |
| --- | --- | --- |
| Types | `npm run typecheck` | **PASS** — no errors |
| Unit tests | `npm test` | **PASS** — 9 suites, 89 tests |
| i18n completeness | `node scripts/check-i18n.mjs` | **PASS** — 14 locales × 114 keys |
| Generated data | `node scripts/build-answers.mjs` | **PASS** — 547 answers (4:83, 5:189, 6:176, 7:99) |
| Guess dictionary | `node scripts/build-dictionary.mjs` | **PASS** — 48,501 words (4:4360, 5:8506, 6:15073, 7:20562) |
| Expo config | `npx expo config --type public` | **PASS** |
| iOS bundle | `npx expo export --platform ios` | **PASS** — 8.0 MB Hermes bytecode |
| Android bundle | `npx expo export --platform android` | **PASS** — 8.2 MB Hermes bytecode |
| Worker types | `cd backend && npm run typecheck` | **PASS** |
| Worker/client parity | `cd backend && npm test` | **PASS** — 3 tests |
| Icon assets | `node scripts/make-icons.mjs` | **PASS** — 6 PNGs generated and visually reviewed |
| UI rules | `node scripts/check-ui-rules.mjs` | **PASS** — 16 files, no colour literal, no untranslated string, no NativeWind no-op |
| Everything above, in one run | `npm run verify` | **PASS** |

## What was NOT run — `UNKNOWN`

Delivery playbook §15.4 gates 3–6, in full:

- **Native build** (`expo prebuild` + `run:ios` / `run:android`) — `UNKNOWN`.
  Not attempted; the user asked for no simulator run in this pass.
- **Launch** (`simctl launch` + screenshot) — `UNKNOWN`. This is the gate that
  catches the iOS 26/27 UIScene crash; `plugins/withIOSSceneLifecycle.js` is in
  place but has not been exercised against this app's generated AppDelegate.
- **Core flow on device** — `UNKNOWN`. `.maestro/daily-flow.yaml` is written but
  has never been executed, and its five-letter assumption means it is only valid
  on days whose answer is five letters.
- **Console cleanliness** — `UNKNOWN`.
- **Purchase / restore / cancel / offline paths** — `UNKNOWN`. No RevenueCat
  project, products or keys exist for this app yet.
- **Ad serving and the UMP consent form** — `UNKNOWN`. The build currently
  carries Google's public **test** app ids and falls back to test ad units.
- **Android RTL and iOS RTL screenshots** — `UNKNOWN`.
- **Worker deployment** — `UNKNOWN`. `backend/wrangler.toml` still holds
  `REPLACE_WITH_KV_NAMESPACE_ID`, and `extra.puzzleApiUrl` is empty, so the app
  currently plays entirely from its bundled list.

## Done outside this repository

- **Legal profile written.** `worddrop` added to `APP_LEGAL_PROFILES` in
  `HushTunnel-Billing-Dashboard/lib/legal/altixcode-apps.ts`, and the legal page
  template extended to handle an ad-supported app: the boilerplate there claimed
  "no advertising SDK" and "we do not collect personal information", which would
  have been a false statement and a store rejection for this app. It now renders
  an Advertising section naming AdMob, what the SDK receives, how UMP consent and
  ATT are handled, and that the one-time purchase ends it.
  **Left uncommitted in that repository** — it also holds someone's in-progress
  legal route, and the staged `slideforge` entry there is missing the required
  `networkUse` and `processedLocally` fields, so the file does not compile yet.
  That error is pre-existing and needs SlideForge'struthful copy, not a guess.
- **Service runbook written.** `docs/setup-services.md` carries the exact
  sequence for Cloudflare/KV, RevenueCat, AdMob, App Store Connect, Play and the
  legal pages, with what to put back into the repo after each. Nothing in it has
  been executed.
- **Store listing copy written.** `worddrop` added to
  `Dev/scripts/store-metadata.json` with English plus `de`, `fr`, `es` and `it`,
  and `node scripts/check-store-metadata.mjs` reports every field within limits.
  `ascAppId` is empty until the App Store Connect record exists.

## Blockers before submission

1. Create the KV namespace, fill `backend/wrangler.toml`, deploy the Worker, set
   `extra.puzzleApiUrl`, and confirm `/health` returns 200 and `/puzzle/today`
   returns a payload whose decoded answer matches the local fallback.
2. RevenueCat: create the app, the `pro` entitlement and a lifetime
   non-consumable on both stores; set `EXPO_PUBLIC_RC_IOS_KEY` and
   `EXPO_PUBLIC_RC_ANDROID_KEY` in the build environment.
3. AdMob: create the app on both platforms and four ad units; replace the test
   app ids in `app.json` and fill `extra.admob`.
4. Legal pages: the `worddrop` entry is written (see above) but is **not
   deployed**. Fix the unrelated `slideforge` compile error, commit, deploy the
   dashboard, then confirm both URLs return 200.
5. Play Console: create the application record by hand (the API cannot), then
   grant the service account access.
6. Run gates 3–6 on both a simulator and an emulator; capture store screenshots
   from those runs.
7. Content review of all 547 answers and clues by a human before launch.

## Notes for whoever picks this up

- **This app deviates from the portfolio's zero-ad-SDK invariant on purpose.**
  It was requested as an ad-supported game with a one-time lifetime removal, so
  AdMob and the UMP consent flow are present. Every privacy claim in the UI,
  the store listing and the legal pages has been written to match that reality —
  do not re-introduce the portfolio's "no third-party SDKs" copy here.
- The self-hosted GitHub Actions runner was recorded as stopped on 2026-09-13
  after filling its disk, so no workflow has run against this repository yet.
- The bundle is ~8 MB of Hermes bytecode, of which the guess dictionary is
  ~290 KB of source. If that needs trimming, the dictionary is the first thing
  to cut down (a frequency-filtered list would roughly halve it).
- `src/game/` is deliberately free of React Native imports so it stays testable
  in plain Node; keep it that way.
