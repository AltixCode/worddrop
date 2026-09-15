# WordDrop — handoff

Written 2026-09-15. Everything below was checked against the live consoles and
the repo on that date, not inferred.

**Where this app stands:** the code is done and verified on both platforms. It
cannot be submitted yet, and the reasons are mostly outside this repo — AdMob is
not configured for it, the legal URLs 404, and no build has ever been uploaded
to either store.

---

## Identifiers

| | |
|---|---|
| Bundle id / package | `com.altixcode.worddrop` |
| App Store Connect app | `6811885940` (version 1.0, `PREPARE_FOR_SUBMISSION`) |
| In-app purchase | `worddrop_lifetime` — ASC id `6811885891`, state `MISSING_METADATA` |
| RevenueCat project | `proje05b0359` |
| RevenueCat apps | iOS `appf5a028a41e` · Android `app4622743f5b` |
| RevenueCat entitlement | `pro` — ❌ **mismatch** — code reads `remove_ads` |
| Play Console | **no record / no bundle uploaded** |
| AdMob | nothing created |

---

## What is done

- **Ads**: AdMob banner + one interstitial a day, in this app's own
  implementation (`src/services/ads.ts`, `src/components/AdBanner.tsx`) rather
  than the shared portfolio one.
- **Interstitial**: app/result.tsx — one interstitial a day, after the result.
- **Consent**: UMP gathered before the SDK starts; `canRequestAds` now gates the
  banner, the interstitial and every ad request, failing closed. Consent is
  published to `src/store/useAdsConsentStore.ts` so the banner re-renders when
  it resolves.
- **Entitlement**: the code reads `remove_ads`. RevenueCat still holds
  `pro` — see the first item under "What is left", because in this state a
  purchase unlocks nothing.
- **Release gate**: `npm run check:release` refuses a build whose identifiers
  are absent, blank, or still a Google test unit. It runs in the store-build workflow before anything is built.
- **Tests**: 94 passing, typecheck clean.
- **Localization**: 14 locales (including `ar` and `fa`)
- **CI**: `.github/workflows/ci.yml` runs typecheck, the test suite and both
  bundle exports.
- **Store build**: `.github/workflows/deploy.yml` builds, signs and uploads to
  TestFlight and Play. It runs `npm run check:release` in both build jobs,
  with the identifiers declared once at workflow level — they were not
  passed to the build at all before, which would have shipped test ad units.
- **Verified on device**: Android — built, installed, launched, consent
  resolved, and the AdMob test banner rendered anchored at the bottom with the
  layout intact. iOS — built, installed, launched, renders, consent flow
  reached.

---

## What is left that an agent can do

1. **Fix the entitlement mismatch — this one ships broken.**
   RevenueCat holds `pro`; the code reads `remove_ads`. A purchase would
   succeed, charge the customer, and unlock nothing. Either create the
   entitlement and attach the existing product:

   ```bash
   rc entitlements create --lookup-key remove_ads \
     --display-name "Pro — Ad-Free & Unlimited" --project-id proje05b0359 --json --yes
   rc entitlements attach <entitlementId> <productId> --project-id proje05b0359 --json --yes
   ```

   …or change `ENTITLEMENT_ID` back to `pro` in `src/services/purchases.ts`.
   The first is the portfolio decision; do not leave them disagreeing.

2. **Capture App Store screenshots.** None exist for this app. Both sizes are
   required: 6.9" iPhone (1320×2868) and 13" iPad (2064×2752). Use
   `Dev/scripts/store-screenshots.sh`, which drives the real app over its own
   fixtures. They land in `store/screenshots/iphone-6.9/` and
   `store/screenshots/ipad-13/`.

3. **Nothing to write for the listing** — 5 locales already carry a
   description and keywords in App Store Connect. The copy lives in
   `Dev/scripts/store-metadata.json`; it now discloses that ads are served by
   Google AdMob, which the previous text did not.

4. **Upload the IAP review screenshot.** The in-app purchase
   (`worddrop_lifetime`) is localized and priced at $3.99, and sits at
   `MISSING_METADATA` for want of one screenshot:

   ```bash
   asccli iap-review-screenshot upload --iap-id 6811885891 --file <path-to-png>
   ```

5. **Rename the purchase.** Its App Store display name and description still
   describe only half of what it does. One purchase removes the ads *and*
   unlocks the paid features, so both halves belong in the copy — something
   like "Pro — Ad-Free & Unlimited" (name ≤ 30 chars, description ≤ 45):

   ```bash
   asccli iap-localizations update --localization-id <id> \
     --name "Pro — Ad-Free & Unlimited" --description "<= 45 chars"
   ```

6. **RTL layout pass.** `ar` and `fa` copy is present and
   `plugins/withAndroidRtl.js` is wired, but the layouts have not been walked in
   RTL. Deliberately left until last.

---

## What only you can do

1. **AdMob — nothing exists for this app.** There is no write API at all; it is
   console-only. Create the app on both platforms, then banner and interstitial ad units,
   and note the ids. Answer **"No, not listed on a supported app store"** while
   the app is unpublished — linking later does not change the ids.

   Then publish a **GDPR message and a US-states message** under Privacy &
   messaging. The SDK can only present a message that exists, and this app fails
   closed on missing consent — so without them it shows **no ads at all** in the
   EEA. Expect "Requires review — limited ad serving" for a couple of days after
   the app goes live; that is not an integration bug.

2. **RevenueCat — Apple credentials.** `appf5a028a41e` (the App Store app in project
   `proje05b0359`) has no Apple credentials, so App Store purchases cannot be
   validated. This needs an interactive Apple ID sign-in with 2FA:

   ```bash
   rc setup apple appf5a028a41e
   ```

   An App Store Connect *API* key can be set non-interactively; the separate
   **In-App Purchase key** cannot, which is why this one is yours.

3. **GitHub secrets.** The signing secrets are present. These are not, and CI now
   fails without them — deliberately, because a build missing one earns nothing
   while looking perfectly healthy. Note this repo lives under
   `atasmohammadi/worddrop`, a **personal account**: the self-hosted
   runners are org-scoped, so any job targeting them queues forever. Keep this
   app's workflows on GitHub-hosted runners, or move the repo into the
   AltixCode org:

   ```
   EXPO_PUBLIC_ADMOB_IOS_APP_ID
   EXPO_PUBLIC_ADMOB_ANDROID_APP_ID
   EXPO_PUBLIC_ADMOB_IOS_BANNER
   EXPO_PUBLIC_ADMOB_ANDROID_BANNER
   EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL
   EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL
   EXPO_PUBLIC_RC_IOS_KEY
   EXPO_PUBLIC_RC_ANDROID_KEY
   ```

   Set each with `gh secret set <KEY> --repo atasmohammadi/worddrop`. The RevenueCat
   public SDK keys are fetchable — `rc api GET "/projects/proje05b0359/apps/appf5a028a41e/public_api_keys"`
   — the AdMob ones come from step 1.

4. **The legal URLs are wrong and they 404.** `src/config/legal.ts` points at
   `https://www.hushtunnel.com/legal/worddrop-privacy` — **hushtunnel.com**, a leftover from the HushTunnel
   template, not an AltixCode domain at all.

   Nothing is served there: altixcode.com only has `/legal/privacy`,
   `/legal/terms` and `/legal/cookies`. Both stores require a working privacy
   policy, the App Store record needs the same URL, and the policy text must now
   disclose that ads are served by Google AdMob and that ATT/UMP consent governs
   personalisation. Either publish per-app pages under altixcode.com or point
   `src/config/legal.ts` at the generic ones — either way the ads paragraph has to be
   written.

5. **Play Console — create the app.** `com.altixcode.worddrop` is not recognised by
   the Publishing API, which means no app record exists or no bundle has ever
   been uploaded. A Play app has **no package name until its first bundle is
   uploaded**, and until then no in-app product can be created. The order is:
   create app → upload an AAB to internal testing → *then* create the product.
   Build that AAB from a non-production profile so internal testers generate no
   live impressions.

6. **App Store review contact.** No contact email or phone is set in App Store
   review information; the readiness check fails on it.

7. **Runners.** This repo's workflows run on GitHub-hosted runners, so the
   stopped self-hosted runner does not block it — but the self-hosted macOS
   runner has been down since 2026-09-13 (it filled the disk), and any job that
   does target it will queue forever.

8. **No EAS project is linked.** `eas env:list` and any EAS build refuse with
   "EAS project not configured", and a robot token cannot configure it
   interactively — it needs `eas init --id <project-id> --non-interactive`, with
   `owner` and the project id then set by hand in the app config.

9. **Play Developer Reporting API is disabled** for project 1013025269741, so
   `gplay apps list` returns 403. The service account cannot enable it
   (`serviceusage.services.enable` is missing); it has to be enabled in the
   Cloud Console.

---

## Fixed recently — context for anything that looks odd

- **Ad unit ids came only from `extra.admob` in `app.json`** — committed as empty
  strings, with Google's *test* app ids hardcoded beside them. A store build
  would have served test ads and earned nothing. Units and app ids now come from
  the environment through `app.config.ts`, and `check:release` refuses a build
  without them.
- **Consent was gathered but never acted on.** A player who declined still got
  non-personalised ads rather than none. `canRequestAds` now gates the banner,
  the interstitial and every ad request, failing closed.
- The ads SDK was on `^16.5.0`; it is pinned to 16.3.4.

---

## Traps already paid for — do not rediscover these

- **`react-native-google-mobile-ads` must stay pinned to exactly 16.3.4.** 16.4+
  pulls play-services-ads 25.3+, whose Kotlin 2.3.0 metadata SDK 57's Kotlin
  2.1.0 refuses to read. Forcing Kotlin up instead breaks `react-native-purchases`
  and `safe-area-context`.
- **iOS 26+ needs UIScene adoption** (`plugins/withIOSSceneLifecycle`). Without
  it the app installs, launches, and quits straight back to the home screen,
  with nothing on screen to explain why.
- **`JAVA_HOME` must be** `/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`
  for any Android build. Gradle otherwise falls back to JDK 25 and CMake dies.
- **A missing identifier fails nothing.** The app falls back to Google's test ad
  units, works perfectly, and earns nothing. That is what `check:release` exists
  to stop.
- **`expo run:android` can fail in a second and leave the previous APK
  installed** — the app then launches, renders, and proves nothing. Check the
  build's own exit code before believing a screenshot.
- **Simulator.app is missing from this Xcode install**, so the ATT prompt cannot
  be dismissed on iOS. iOS verification ends at "builds, installs, launches,
  renders"; drive interaction on Android.

---

## Commands

```bash
npm run typecheck && npm test          # both clean as of 2026-09-15
npm run check:release                  # fails until the identifiers exist — correct
../scripts/verify-app.sh worddrop com.altixcode.worddrop   # full build + device verification, both platforms
```

The portfolio-wide notes live in `Dev/AGENTS.md`, and the store/console playbook
in `Dev/gridlock-pop/docs/mobile-playbook.md`. The shared ad integration is
ported by `Dev/scripts/port-ads.mjs` from CapFlow, which is the reference.

---

## One caution

Everything in this repo is **uncommitted**. Read `git status` before assuming
the working tree matches `main`.
