# HANDOFF — WordDrop

**Read this first if you are picking the app up.** It is the single source of
truth for what exists, what is verified, and what is left. Anything not recorded
here as verified is `UNKNOWN`, never a pass (`docs/agents/14.4`).

- **Status**: `NOT_READY_FOR_SUBMISSION`
- **Last updated**: 2026-09-15
- **Last commit reviewed**: `79e6955`
- **Repository**: https://github.com/atasmohammadi/worddrop (private, personal account)

---

## 1. What the app is

A daily film-themed word puzzle. Every player worldwide gets the same 4–7 letter
word each day and six guesses, keeps a streak, and can share a spoiler-free
emoji grid. Free with ads; **one lifetime non-consumable purchase** removes every
ad and opens the archive of past puzzles. No accounts, no subscription.

| | |
| --- | --- |
| Stack | Expo SDK 57, RN 0.86, TypeScript strict, Expo Router, Zustand + AsyncStorage |
| Identifiers | `com.altixcode.worddrop` both stores, scheme `worddrop://` |
| Payments | RevenueCat, entitlement **`pro`**, product `worddrop_lifetime`, $5.99 |
| Ads | AdMob — one interstitial/day after the result, one anchored banner; UMP consent + iOS ATT |
| Backend | Cloudflare Worker + KV, cron 00:00 UTC (`backend/`) |
| Languages | 14 in the app (`en es fr de ru zh ja pt ko it tr ar fa el`), RTL for `ar`/`fa` |
| Puzzle epoch | `2026-01-01` = puzzle #1. 547 answers; the list repeats from **2028-03-15** |

### The one design property everything rests on

The client can derive the day's puzzle **offline**, with the identical algorithm
the Worker uses, from the same generated list. The Worker exists so a word can be
corrected or an event puzzle run after release — not because the app needs it.
`backend/test/parity.test.mjs` fails the build if the two copies ever drift.
Never "simplify" one side without the other.

---

## 2. Verified, and how

All run locally on 2026-09-15 at commit `79e6955`. One command re-runs the lot:

```bash
npm run verify     # typecheck, tests, i18n, UI rules, data drift, both exports, worker parity
```

| Check | Result |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 10 suites, 94 tests |
| `node scripts/check-i18n.mjs` | PASS — 14 locales × 114 keys |
| `node scripts/check-ui-rules.mjs` | PASS — 16 files, no colour literal, no untranslated string, no NativeWind no-op |
| `node scripts/build-answers.mjs` | PASS — 547 answers (4:83, 5:189, 6:176, 7:99) |
| `npx expo config --type public` | PASS |
| `expo export` ios / android | PASS — ~8 MB Hermes bytecode each |
| `backend`: typecheck + parity | PASS — 3 tests |
| Worker live | PASS — `/health` ok; `2026-09-15` serves `HIGHKEY` #258, identical to the offline fallback |

**These prove the JS graph resolves and the logic is sound. They do not prove the
app launches.** Gates 3–6 of `docs/agents/11-delivery-playbook.md` §15.4 have
never been run. See §5.

---

## 3. Everything that has been provisioned

### App Store Connect

| Thing | Value |
| --- | --- |
| App id | `6811885940` — "WordDrop: Daily Word Game", SKU `worddrop-ios` |
| Bundle id record | `23R989Y7B7` |
| App info id | `3a181c0e-1fdd-44fa-9656-a8e05a042562` |
| Version 1.0 id | `ec2393be-b809-4ad5-91b3-d0123266069a` |
| IAP | `6811885891` · `worddrop_lifetime` · non-consumable · **$5.99** USA base, auto-equalised · state `MISSING_METADATA` |
| Category | Games → Word (secondary subcategory Puzzle) |
| Age rating | everything `NONE`/false **except `isAdvertising: true`** |
| Content rights | `DOES_NOT_USE_THIRD_PARTY_CONTENT` |
| Export compliance | answered in the binary — `ios.config.usesNonExemptEncryption: false` |
| Listing locales done | `en-US`, `de-DE`, `fr-FR`, `es-ES`, `it` — description, keywords, promo, name, subtitle |
| Privacy policy URL | set on every locale (the URL 404s today — §6.5) |
| Support URL | `https://www.altixcode.com/contact` on every locale (200) |

`asc versions check-readiness --version-id ec2393be-b809-4ad5-91b3-d0123266069a`
currently reports exactly two things outstanding: **a build** and **screenshots**.

### RevenueCat

| Thing | Value |
| --- | --- |
| Project | `proje05b0359` (WordDrop) |
| iOS app | `appf5a028a41e` — key `appl_ZztjeICpUKBKKRZeGrbcAFyuuRj` |
| Android app | `app4622743f5b` — key `goog_NurwIooYjLJUlJPeBOyzsRiLPFN` |
| Entitlement | `entlb7b44b4c9b`, lookup key **`pro`** ← the app checks this exact string |
| Products | `prod6f040e12df` (App Store) · `prod8f69b0d480` (Play), store id `worddrop_lifetime` |
| Offering | `ofrngc09e9ed06f` `default` (current) |
| Package | `pkged6b8d873d6` `$rc_lifetime`, both products attached |
| Apple credentials | **NOT configured** — `app_store_connect_api_key_configured: false` |
| Play credentials | **NOT configured** |
| Vendor number | currently the literal `"x"` — see §6.3 |

### Cloudflare

| Thing | Value |
| --- | --- |
| Worker | `worddrop-puzzle`, cron `0 0 * * *` |
| URL | `https://worddrop-puzzle.worddrop-puzzle-worker.workers.dev` (in `app.json` → `extra.puzzleApiUrl`) |
| KV | `5a352f43e31d4a1898b7f92ff76e40a8` (preview `f556c08ee9ac475d85fab105b06a23e5`) |
| Account | `aa579917b406920cf3eefc3489003e1f` |
| Cost | $0 — one request per player per day against a 100k/day free tier, one KV write per day against 1,000 |

### GitHub

Repository **variables**: `ENABLE_WORKER_DEPLOY=true`, `EXPO_PUBLIC_RC_IOS_KEY`,
`EXPO_PUBLIC_RC_ANDROID_KEY`.

Repository **secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`EXPO_PUBLIC_ADMOB_{IOS,ANDROID}_{APP_ID,BANNER,INTERSTITIAL,REWARDED}`,
`EXPO_PUBLIC_REVENUECAT_{IOS,ANDROID}_KEY`.

> The app reads `EXPO_PUBLIC_RC_*`; the `EXPO_PUBLIC_REVENUECAT_*` secrets are a
> second naming convention kept only as a fallback in `deploy.yml`. There are no
> rewarded ads in this app — those two secrets are unused.

Workflows: `ci.yml` (PRs, hosted), `deploy.yml` (`v*` tags + dispatch),
`worker-deploy.yml` (pushes touching `backend/`, hosted).

---

## 4. Work an agent can do without a human

Ordered by value. Everything here is scriptable from this machine.

### 4.1 Finish the store listing localization
The app ships 14 languages; the App Store listing has 5. Portfolio standard
(`docs/agents/12-product-standards.md` §16.4) is the ten mandatory locales.

Missing on the App Store: `ru`, `zh-Hans`, `ja`, `pt-BR`, `ko`, `tr`, `ar-SA`,
`el`. **App Store Connect has no Persian locale** — `fa` ships in the app and
cannot be listed; do not delete it to "match". Google Play does support `fa-IR`,
so the Play listing eventually carries all fourteen.

Write them into `Dev/scripts/store-metadata.json` under `worddrop.locales`, then:

```bash
cd /Volumes/ExtremePro/Dev
node scripts/check-store-metadata.mjs            # field limits; App Store rejects the whole save
node scripts/upload-store-metadata.mjs worddrop --dry
node scripts/upload-store-metadata.mjs worddrop
```

Keywords are per-market research, never a translation of the English field, and
must not repeat words already in that locale's name or subtitle.

### 4.2 Re-attempt ads after a consent failure
`initAds` gathers UMP consent once. If that throws — first launch offline, say —
`canRequestAds` stays false and **no ad is requested for the rest of the
session**. Correct and deliberate as a default, but a quiet revenue leak. Retry
on the next foreground (`AppState` → `active`) when `started` is still false.

### 4.3 Top up the answer list before 2028-03-15
`docs/word-list.md` has the procedure. Appending changes the order of *future*
puzzles and never a published one (the Worker stores each day in KV the first
time it is served).

### 4.4 Housekeeping
- `USING_TEST_ADS` in `src/config/env.ts` is exported and used by nothing.
- `npm run check:release` fails on a dev machine because it runs under plain Node
  and does not read `.env`. Export the variables or accept that it is a CI check.

---

## 5. Work that needs a device — the real blocker

None of this can be faked, and none of it is optional. Gates from
`docs/agents/11-delivery-playbook.md` §15.4:

| Gate | Command | Status |
| --- | --- | --- |
| 3. Native build | `npx expo prebuild --clean` then `npx expo run:ios` / `run:android` | **UNKNOWN** |
| 4. **Launch** | `xcrun simctl launch <udid> com.altixcode.worddrop`, then screenshot | **UNKNOWN** |
| 5. Core flow | play a real puzzle to a win and a loss, share the grid | **UNKNOWN** |
| 6. Console | zero uncaught exceptions across the whole flow | **UNKNOWN** |

Gate 4 is the one that matters most here: `plugins/withIOSSceneLifecycle.js` has
never been exercised against this app's generated `AppDelegate.swift`. That
plugin is the fix for the iOS 26/27 UIScene crash that once produced six
"production ready" apps that could not open. `tsc`, `expo export` and
`xcodebuild` all pass on an app that dies before its first frame.

Then, in order:

1. **Purchases** against `storekit/WordDrop.storekit` (see `storekit/README.md`).
   Exercise all four paths — buy, restore, cancel, store-unreachable. The last is
   the one that matters: an unreachable store must grant nothing.
2. **Ads**: UMP form appears, the ATT prompt appears after it, a refusal means no
   ad is requested at all, the interstitial fires once after the first result of
   the day and never between guesses.
3. **Screenshots** for the store, captured from the real build via
   `.maestro/screenshots.yaml` — 6.7" iPhone and 13" iPad for the App Store,
   phone and 7"/10" tablet for Play. Never a marketing render.
4. **A review screenshot of the paywall**, uploaded to the IAP
   (`asc iap-review-screenshot upload --file <path> --iap-id 6811885891`). Until
   then the IAP stays `MISSING_METADATA` and cannot be submitted.
5. **RTL check** under `ar` and `fa` on both platforms, per
   `docs/agents/12-product-standards.md` §16.1.2–16.1.3. The verification there
   is a screenshot, and `debug.force_rtl` is **not** honoured by React Native.
6. `.maestro/daily-flow.yaml` has never run. Note its five-letter assumption: on a
   day whose answer is 4, 6 or 7 letters it reports "not enough letters", which is
   "not applicable today", not a pass.

---

## 6. Manual work only the account owner can do

Each of these was attempted and is genuinely blocked, not skipped.

### 6.1 In-App Purchase Key — blocks every sale
`react-native-purchases` 10 uses StoreKit 2, and RevenueCat will not record those
transactions without an In-App Purchase Key. Without it a purchase succeeds at
Apple and the entitlement never arrives.

App Store Connect → **Users and Access → Integrations → In-App Purchase** →
generate, download the `.p8` **once**, upload it to the RevenueCat iOS app. One
key covers every app in the account, so this is once for the whole portfolio.

### 6.2 RevenueCat store credentials
Both flows need an interactive sign-in:

```bash
env -u RC_API_KEY -u REVENUECAT_API_KEY -u REVENUECAT_SECRET_API_KEY \
  rc apps apple setup appf5a028a41e --project-id proje05b0359    # Apple ID + 2FA
env -u RC_API_KEY -u REVENUECAT_API_KEY -u REVENUECAT_SECRET_API_KEY \
  rc setup google --project-id proje05b0359 --package com.altixcode.worddrop
```

The Google run on 2026-09-14 got as far as enabling the APIs and creating the
service account, then failed granting Play access because the Play record does
not exist (§6.4). Re-run it **after** creating that record; pass
`--keep-old-keys` to leave the existing service-account key alone.

**The v2 API is not a way around either.** Posting an App Store Connect key to
`/projects/…/apps/…` returns 200 and stores nothing — verified across PATCH
(405), and POST with the key as raw PEM, as base64, and as stripped PEM body.
Re-read the app afterwards; that is what shows the truth. Details in
`docs/setup-services.md` §2.

### 6.3 Fix the RevenueCat vendor number
It currently holds the literal string `"x"`, written while mapping which fields
the API actually persists. The API rejects both `null` and `""`, so it can only
be overwritten. Find the 8-digit number in App Store Connect → Payments and
Financial Reports, then either run §6.2's Apple flow (which sets it) or:

```bash
printf '{"app_store":{"app_store_connect_vendor_number":"NNNNNNNN"}}' | \
env -u RC_API_KEY -u REVENUECAT_API_KEY -u REVENUECAT_SECRET_API_KEY \
  rc api POST /projects/proje05b0359/apps/appf5a028a41e --body @-
```

### 6.4 Create the Google Play record
`gplay edits create --package com.altixcode.worddrop` returns **404 Package not
found** — the Developer API cannot create an application. Create it by hand in
the Play Console, grant the service account
(`~/Certificates/play-store-service-account.json`) access, then create and price
the `worddrop_lifetime` product there. A 403 later would mean missing access; a
404 means the record still does not exist.

### 6.5 Deploy the legal pages
Both URLs 404 today, and App Review follows the link:

```bash
for k in privacy terms; do
  curl -s -o /dev/null -w "%{http_code} worddrop-$k\n" \
    "https://www.hushtunnel.com/legal/worddrop-$k"; done
```

The `worddrop` profile is already written into
`HushTunnel-Billing-Dashboard/lib/legal/altixcode-apps.ts`, along with the
`advertising` support that keeps the page from claiming "no advertising SDK" for
this app. **It is uncommitted there and the file does not compile**: an unrelated,
pre-existing `slideforge` entry is missing its required `networkUse` and
`processedLocally` fields. Fill those in truthfully (do not guess SlideForge's
network behaviour), commit, deploy, then re-run the curl above.

### 6.6 CI signing secrets — the release pipeline cannot sign anything
`netpulse` carries these; `worddrop` has none, so `deploy.yml` fails at the
signing steps. Attempting to set them from here is blocked by the permission
classifier, so run them yourself:

```bash
gh secret set APP_STORE_CONNECT_API_KEY_CONTENT --repo atasmohammadi/worddrop < ~/Certificates/AuthKey_NGDJQCGYXQ.p8
gh secret set APP_STORE_CONNECT_API_KEY_ID      --body NGDJQCGYXQ --repo atasmohammadi/worddrop
gh secret set APP_STORE_CONNECT_API_KEY_ISSUER  --body c7e17516-b80c-42fe-a192-229b4cee0a48 --repo atasmohammadi/worddrop
gh secret set PLAY_STORE_SERVICE_ACCOUNT_JSON   --repo atasmohammadi/worddrop < ~/Certificates/play-store-service-account.json
```

There is **no Android upload keystore** for this app anywhere on disk. One has to
be generated, then stored both as repository secrets
(`APP_KEYSTORE_BASE64`, `APP_KEYSTORE_PASSWORD`, `APP_KEYSTORE_ALIAS`,
`APP_KEY_PASSWORD`) and somewhere you can retrieve it — GitHub secrets are
write-only, so a keystore that exists *only* there is one incident away from a
Play upload-key reset:

```bash
keytool -genkeypair -v -keystore ~/Certificates/worddrop-upload.jks \
  -alias worddrop -keyalg RSA -keysize 2048 -validity 10000
base64 -i ~/Certificates/worddrop-upload.jks | \
  gh secret set APP_KEYSTORE_BASE64 --repo atasmohammadi/worddrop
```

### 6.7 Privacy label and Data safety
Console-only on both stores, and they must match the binary. This app is **not**
"collects no data": disclose **AdMob** (device identifiers, IP, coarse usage —
tracking only with consent) *and* **RevenueCat** (anonymous app user id, store
receipt, country). `docs/store-listing.md` has the exact table.

### 6.8 Content review of the answer list
Read all 547 rows for offensive words, ambiguous entries, and clues that give the
answer away. Nothing automates this.

```bash
npm run schedule -- --all      # the review sheet
npm run schedule               # the next 14 days
```

### 6.9 GitHub Actions is quota-blocked
A triggered run sits at `pending` with **zero jobs created** while the repository
reports Actions enabled — the account's storage quota signature, not a
configuration fault. 22 GB of artifacts were purged on 2026-09-14 and GitHub
recalculates usage every 6–12 hours. **No workflow has ever run green against
this repository**; everything in §2 was run locally. Re-run once accounting
catches up.

Related: no self-hosted runner is registered to this repo (they belong to the
AltixCode org; this repo is personal), which is why CI, the Worker deploy and the
release pipeline's Linux jobs were retargeted to `ubuntu-24.04`. The **iOS job
still defaults to the self-hosted Mac mini** because the signing identity lives
there and hosted macOS minutes bill at 10×; a release build therefore needs that
runner registered here, or a dispatch with `ios_runner: github-hosted`.

---

## 7. Traps that have already cost time

- **`RC_API_KEY` in `~/.zshrc` is scoped to the HushTunnel project** and shadows
  the profile's OAuth login. Any `rc` command against another project fails with
  `The API key does not belong to the project …`. Strip the three env vars and
  pass `--project-id`, as in §6.2. The profile's *active* project is also
  BlockJam (`proj62d4d4fd`), so an unflagged command lands there.
- **Apple has no app-creation endpoint.** `asccli apps` only lists and updates.
  The record was created with `asc iris apps create`, which drives App Store
  Connect's private API using the browser session on this machine (`asc iris
  status`). `asc iris apps list` returning `{"data":[]}` does **not** mean the
  session is dead.
- **Wrangler 4 KV commands are local by default.** `wrangler kv key get …`
  without `--remote` reports `Value not found` for a key sitting in production.
- **A 200 from RevenueCat's app endpoint is not evidence.** Re-read the resource.
- **Cross-app contamination is real.** On 2026-09-15 the entitlement id in
  `src/services/purchases.ts` had become `remove_ads`, which is BlockJam's key.
  WordDrop's is `pro`. That defect is silent end to end: the purchase completes,
  the entitlement is never found, the customer pays for nothing. If you touch
  that constant, check it against `rc entitlements list --project-id proje05b0359`.
- **`git status` before you start.** Another session has twice left substantial
  uncommitted work in this tree.

---

## 8. Definition of done

Submission may be claimed only when **all** of these hold:

- [ ] Every shipped feature genuinely works on device; no stub or simulated path
- [ ] Store listing, `i18n` and release notes claim only what the build does
- [ ] Gates 1–6 pass on **both** an iOS simulator and an Android emulator (§5)
- [ ] Paywall shows the live store price, links working legal pages, and grants
      nothing when the store is unreachable
- [ ] Purchase, restore, cancel and offline paths exercised on both stores
- [ ] Privacy policy and terms return 200 and match the binary's real behaviour
- [ ] Both store records complete: icon, screenshots, pricing, privacy label,
      content rating, export compliance
- [ ] The release workflow has completed green end to end, and the GitHub Release
      carries `.ipa`, `.apk`, `.aab` and `SHA256SUMS.txt`
- [ ] This file records the commit, the exact commands run, their results, and
      every remaining blocker

## 9. Where things are

```
app/              screens: index, game, result, stats, archive, settings, paywall
src/game/         pure, fully tested logic — evaluateGuess, selection, streak, shareGrid, codec
src/data/         GENERATED — rebuild with scripts/build-answers.mjs, build-dictionary.mjs
src/services/     purchases (RevenueCat), ads (AdMob + UMP + ATT), notifications, puzzleService
src/store/        Zustand + AsyncStorage; the persisted board holds the answer encoded
src/i18n/         14 locales in one file; every user-facing string goes through t()
backend/          Cloudflare Worker + KV, and the parity test against the client
plugins/          iOS UIScene lifecycle, Android locales, Android RTL
storekit/         StoreKit test configuration and how to use it
docs/             setup-services.md (accounts), store-listing.md (ASO), word-list.md (content)
```

`AGENTS.md` (symlinked to `CLAUDE.md` and `GEMINI.md`) carries the rules for
working in this repo. Portfolio-wide standards live in
`/Volumes/ExtremePro/Dev/docs/agents/`.
