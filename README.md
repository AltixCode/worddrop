# WordDrop

A daily film-themed word puzzle. Everyone in the world gets the same word each
day, six guesses, a streak, and a spoiler-free emoji grid to share.

Free to play with ads; a **single one-time purchase** removes every ad and opens
the archive. No subscriptions, no accounts, no sign-in.

| | |
| --- | --- |
| Framework | Expo SDK 57, React Native 0.86, TypeScript (strict), Expo Router |
| State | Zustand + AsyncStorage (persisted board, streak and settings) |
| Payments | RevenueCat, entitlement `pro`, one lifetime non-consumable |
| Ads | Google AdMob — one interstitial a day after the result, one anchored banner |
| Backend | Cloudflare Worker + KV, one cron a day at 00:00 UTC (`backend/`) |
| Identifiers | `com.altixcode.worddrop` on both stores, scheme `worddrop://` |
| Languages | 14 (`en es fr de ru zh ja pt ko it tr ar fa el`), RTL for `ar`/`fa` |

## How the daily puzzle works

1. A Cloudflare Worker publishes the day's puzzle into KV at UTC midnight. The
   selection is a pure function of the day index, so re-running it never changes
   a past answer.
2. The app fetches `GET /puzzle/<date>` once a day and caches the board.
3. **If the fetch fails, the app derives the same puzzle locally** from the
   bundled word list using the identical algorithm — the game works on a plane
   and on a first launch with no signal. `backend/test/parity.test.mjs` fails the
   build if the two copies of that algorithm ever drift apart.
4. Play, streaks and statistics are entirely on-device. The player's "today" is
   their own local date; the puzzle is global, the streak is local.

## Commands

```bash
npm start                    # Expo dev server
npm run ios | android        # native run (requires a prebuild)
npm test                     # Jest — game logic, plurals, word data
npm run typecheck            # tsc --noEmit
node scripts/check-i18n.mjs  # every locale defines every key
node scripts/build-answers.mjs      # answers.source.tsv → app + worker artefacts
node scripts/build-dictionary.mjs   # system word list → allowed guesses
node scripts/make-icons.mjs         # regenerate every icon asset
cd backend && npm test && npm run deploy   # worker parity tests, then deploy
```

## Configuration

Nothing secret lives in the repo. Set before a store build:

| Where | Key | Meaning |
| --- | --- | --- |
| env | `EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY` | RevenueCat public SDK keys. Without them the paywall reports the store as unreachable and grants nothing. |
| `app.json` → `extra.puzzleApiUrl` | Worker base URL | Empty means offline-only: the app uses the bundled list. |
| `app.json` → `extra.admob.*` | Ad unit ids | Empty falls back to Google's **test** units, so a dev build never requests a live ad. |
| `app.json` → plugin `react-native-google-mobile-ads` | App ids | Currently Google's public test app ids — replace with the real ones before submission. |

## Documentation

- `docs/word-list.md` — how the answer list is curated and topped up
- `docs/store-listing.md` — store metadata, ASO and the submission checklist
- `HANDOFF.md` — what has actually been run and what has not
