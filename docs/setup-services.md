# Service setup — the accounts this app needs

Nothing here has been done yet (see `HANDOFF.md`). Each section is the exact
sequence, and what to put back into the repo afterwards. No credential is ever
committed: SDK keys come from the build environment, store credentials from
GitHub Actions secrets.

---

## 1. Cloudflare — the puzzle Worker

Needed for "everyone gets the same word". The app already plays without it, from
the bundled list, so this is not a launch blocker — but without it a player who
reinstalls mid-list can drift from everyone else if the word list is ever
reordered.

```bash
cd backend
npx wrangler login                       # or set CLOUDFLARE_API_TOKEN
npx wrangler kv namespace create PUZZLES
npx wrangler kv namespace create PUZZLES --preview
```

Put the two ids into `backend/wrangler.toml` (`id`, `preview_id`), then:

```bash
npx wrangler deploy
curl -s https://worddrop-puzzle.<subdomain>.workers.dev/health
curl -s https://worddrop-puzzle.<subdomain>.workers.dev/puzzle/today
```

`/health` returns the answer count and the UTC date. `/puzzle/today` returns the
published record; its `a` field is the obfuscated answer — decode it with
`node -e` against `src/game/puzzleCodec.ts` and check it matches
`node scripts/preview-schedule.mjs <date> 1`.

Then set `extra.puzzleApiUrl` in `app.json` to that base URL, and in the
repository settings add the variable `ENABLE_WORKER_DEPLOY=true` plus the
secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` so
`.github/workflows/worker-deploy.yml` stops skipping.

**The cron matters more than the endpoint.** Publication is idempotent and the
endpoint publishes on demand, so a missed cron run is not a failure — but leave
it in place, because it keeps KV warm and makes a broken deploy visible the next
morning rather than the next launch.

---

## 2. RevenueCat — the lifetime unlock — **DONE, except store credentials**

Created 2026-09-14 with the `rc` CLI, in its own project (not HushTunnel's):

| Thing | Id |
| --- | --- |
| Project | `proje05b0359` (WordDrop) |
| iOS app | `appf5a028a41e` — bundle `com.altixcode.worddrop` |
| Android app | `app4622743f5b` — package `com.altixcode.worddrop` |
| Entitlement | `entlb7b44b4c9b`, lookup key **`pro`** — the string the app checks |
| Products | `prod6f040e12df` (App Store, non-consumable) · `prod8f69b0d480` (Play, one-time), both store id **`worddrop_lifetime`** |
| Offering | `ofrngc09e9ed06f`, lookup key `default`, current |
| Package | `pkged6b8d873d6`, lookup key `$rc_lifetime`, both products attached |

`rc offerings verify ofrngc09e9ed06f --project-id proje05b0359` confirms the
chain. The public SDK keys are in the repository's Actions **variables** and in
a local, git-ignored `.env`:

```
EXPO_PUBLIC_RC_IOS_KEY=appl_…      EXPO_PUBLIC_RC_ANDROID_KEY=goog_…
```

> App Store Connect consumes a product id permanently once registered, even if
> deleted. `worddrop_lifetime` is now the id; do not reuse it for anything else.

### What is still missing

Both remaining steps need an interactive sign-in, so they cannot be scripted here:

```bash
rc apps apple setup appf5a028a41e     # Apple Account + 2FA
rc setup google                        # Google sign-in in a browser
```

The Apple one also **creates the App Store Connect app record** when the bundle
id has none — which is the only route to that record, because Apple's API cannot
create apps (see §4). Until these run, RevenueCat cannot validate a receipt:
`app_store_connect_api_key_configured` is `false` on the iOS app.

Then create the actual store products (`worddrop_lifetime`) in App Store Connect
and Play Console, and price them. Suggested: the portfolio's usual $4.99–$7.99
one-time band.

Verification, before submission: purchase, restore, cancel and offline paths,
against a StoreKit configuration and the Play internal test track. The paywall
must show the store's own price (it reads `product.priceString`) and must grant
nothing when the store is unreachable.

---

## 3. AdMob — the advertising

Create by hand in the AdMob console; there is no API for creating apps or units.

| What | Where it goes |
| --- | --- |
| iOS app id (`ca-app-pub-…~…`) | `app.json` → plugin `react-native-google-mobile-ads` → `iosAppId` |
| Android app id | same plugin → `androidAppId` |
| iOS/Android **banner** unit ids | `app.json` → `extra.admob.iosBanner` / `androidBanner` |
| iOS/Android **interstitial** unit ids | `app.json` → `extra.admob.iosInterstitial` / `androidInterstitial` |

Until those are filled the app uses Google's public **test** ids, and
`USING_TEST_ADS` in `src/config/env.ts` is true. Do not ship a build in that
state: serving live ads to a test configuration — or the reverse — is a policy
problem.

In the AdMob console also configure the **UMP consent form** (GDPR message plus
the privacy options form), or `AdsConsent.showPrivacyOptionsForm()` in Settings
has nothing to show. Ads default to non-personalised until consent says
otherwise; keep it that way.

---

## 4. App Store Connect — **bundle id registered**

The bundle identifier `com.altixcode.worddrop` is registered in the Developer
Portal as **`23R989Y7B7`** (`asccli bundle-ids list`).

**The app record itself cannot be created by API.** `asccli apps` offers only
`list` and `update`, because Apple's App Store Connect API has no app-creation
endpoint — the portfolio's existing six records were made by hand. Create it
either in the App Store Connect UI, or by running `rc apps apple setup
appf5a028a41e`, which offers to create it as part of the Apple credential flow
(§2) and is the faster path since that credential is needed anyway.

The record needs: bundle id `com.altixcode.worddrop`,
primary category Games → Word, age rating 4+, and the privacy nutrition label
filled in exactly as `docs/store-listing.md` describes — RevenueCat **and**
AdMob both disclosed.

Listing copy is already written in `Dev/scripts/store-metadata.json` under
`worddrop` (English plus `de`, `fr`, `es`, `it`) and passes
`node scripts/check-store-metadata.mjs`. Once the record exists, put its id in
that entry's `ascAppId` and push the copy with
`node scripts/upload-store-metadata.mjs worddrop --dry` first.

## 5. Google Play

The Developer API **cannot create an application**. Create the record by hand in
the Play Console first, then grant the existing service account
(`~/Certificates/play-store-service-account.json`) access to it. A
`403 The caller does not have permission` from `gplay` means the record does not
exist yet or access was not granted — it is not an API-enablement problem.

Play also needs the Data safety form completed to match the privacy policy, and
the app is not eligible for the "no data collected" answer.

---

## 6. Legal pages

`worddrop` is already written into `APP_LEGAL_PROFILES` in
`HushTunnel-Billing-Dashboard/lib/legal/altixcode-apps.ts`, including the
Advertising section. It is **not deployed yet**. Deploy the dashboard, then:

```bash
for k in privacy terms; do
  curl -s -o /dev/null -w "%{http_code} worddrop-$k\n" \
    "https://www.hushtunnel.com/legal/worddrop-$k"
done
```

Both must return 200 before submission — App Review follows the link.
