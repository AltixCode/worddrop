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

## 2. RevenueCat — the lifetime unlock

The portfolio's `rc` CLI is already configured (`~/.zshrc`). WordDrop needs its
**own project**, not HushTunnel's:

1. Create the project and the two apps (iOS + Android) in the RevenueCat
   dashboard, or with `rc`. Record the project id here when it exists.
2. Entitlement: identifier **`pro`** — the app checks this string and nothing else.
3. Products: one **non-consumable** on the App Store and one **one-time product**
   on Play. Suggested ids: `worddrop_lifetime` on both.
   > App Store Connect consumes a product id permanently once registered, even
   > if deleted. Pick the id once and do not reuse a deleted one.
4. Offering `default`, package type **lifetime**, with both products attached.
5. Copy the two public SDK keys into the build environment:
   `EXPO_PUBLIC_RC_IOS_KEY`, `EXPO_PUBLIC_RC_ANDROID_KEY`.

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

## 4. App Store Connect

An app record can be created through the API with the team key in
`~/Certificates` (`asccli`). It needs: bundle id `com.altixcode.worddrop`,
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
