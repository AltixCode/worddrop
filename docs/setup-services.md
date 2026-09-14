# Service setup — the accounts this app needs

Nothing here has been done yet (see `HANDOFF.md`). Each section is the exact
sequence, and what to put back into the repo afterwards. No credential is ever
committed: SDK keys come from the build environment, store credentials from
GitHub Actions secrets.

---

## 1. Cloudflare — the puzzle Worker — **DEPLOYED**

Live at **`https://worddrop-puzzle.worddrop-puzzle-worker.workers.dev`**, which
is what `app.json` → `extra.puzzleApiUrl` points at.

| Thing | Value |
| --- | --- |
| Worker | `worddrop-puzzle`, cron `0 0 * * *` |
| KV namespace | `5a352f43e31d4a1898b7f92ff76e40a8` (preview `f556c08ee9ac475d85fab105b06a23e5`) |
| Credentials | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` exported from `~/.zshrc`, and set as repository secrets |
| CI | `ENABLE_WORKER_DEPLOY=true`, so `worker-deploy.yml` deploys on a push that touches `backend/` |

Verified live on 2026-09-14:

| Request | Result |
| --- | --- |
| `/health` | `{"ok":true,"answers":547,...}` |
| `/puzzle/2026-09-14` | ROGUE (#257) — **identical to the app's offline fallback** for that date |
| `/puzzle/2026-03-01` | HOOK (#60) — likewise |
| `/puzzle/today` | byte-identical to the dated request |
| `/puzzle/2026-09-15` (future) | `403 not_yet_published` |
| `/puzzle/2025-12-31` (pre-launch) | `404 before_launch` |
| `/puzzle/2026-02-30`, `/puzzle/2026-13-01` | `400 bad_date` |
| KV after serving | `puzzle:2026-03-01`, `puzzle:2026-09-14` stored |

Re-running the checks:

```bash
cd backend
npx wrangler deploy
npx wrangler kv key list --namespace-id 5a352f43e31d4a1898b7f92ff76e40a8 --remote
```

> **`--remote` is not optional.** Wrangler 4's KV commands read and write the
> *local* simulator by default, so without it `kv key get` reports
> `Value not found` for a key that is sitting in production — which reads as a
> broken Worker rather than a misdirected query.

Costs nothing at this scale: the free tier allows 100,000 requests a day and the
app makes one per player per day, cached thereafter; the cron writes a single KV
key per day against a 1,000/day allowance.

Optional later: put it behind a custom domain (`puzzle.altixcode.com`) so the
endpoint is not tied to the generated `workers.dev` subdomain. Changing it means
changing `extra.puzzleApiUrl`, which needs an app release — the fallback keeps
old versions playable either way.

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

The store credentials on the RevenueCat apps. Both routes need an interactive
sign-in that cannot be scripted:

```bash
rc apps apple setup appf5a028a41e     # Apple Account + 2FA
rc setup google                       # Google sign-in in a browser
```

The v2 API is **not** a way around it. `POST /projects/…/apps/…` with an
`app_store.app_store_connect_api_key` body returns 200 and changes nothing:
`app_store_connect_api_key_configured` stays `false` on a fresh read. Uploading
the key is a dashboard action (or the Apple-ID flow above); the 200 is not
evidence that it worked, and re-reading is what shows it did not.

The App Store product itself already exists and is priced — see §4 — so once the
credentials are in place RevenueCat has something to validate against.

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

## 4. App Store Connect — **record created, text metadata done**

Created 2026-09-14. The app record could not be made with the App Store Connect
API — `asccli apps` offers only `list` and `update`, because Apple exposes no
app-creation endpoint. It was created through `asccli iris apps create`, which
drives App Store Connect's own private API using the browser session already on
this machine (`asc iris status` shows the cookies).

| Thing | Value |
| --- | --- |
| App id | **6811885940** — `WordDrop: Daily Word Game`, SKU `worddrop-ios` |
| Bundle id | `com.altixcode.worddrop` (Developer Portal id `23R989Y7B7`) |
| App info id | `3a181c0e-1fdd-44fa-9656-a8e05a042562` |
| Version | `1.0` — `ec2393be-b809-4ad5-91b3-d0123266069a` |
| Category | Games → Word, secondary subcategory Puzzle |
| In-app purchase | **6811885891**, `worddrop_lifetime`, non-consumable, **$5.99** base (USA), auto-equalised worldwide |

Done by API:

- Listing copy for `en-US`, `de-DE`, `fr-FR`, `es-ES` and `it`, pushed with
  `node scripts/upload-store-metadata.mjs worddrop` from the `Dev` root.
- Privacy policy URL on every locale
  (`https://www.hushtunnel.com/legal/worddrop-privacy` — **still 404 until the
  dashboard is deployed**, §6).
- Support URL on every locale (`https://www.altixcode.com/contact`, verified 200).
- IAP localizations in the same five locales, plus a review note explaining how
  to reach and test the purchase.
- Age rating declared truthfully: everything `NONE`/false **except
  `isAdvertising: true`**, because the app does show ads.

`asc versions check-readiness --version-id ec2393be-b809-4ad5-91b3-d0123266069a`
now reports every locale passing on description, keywords and support URL, and
exactly two things outstanding — **a build** and **screenshots**. Both need the
app to run on hardware; neither can be honestly produced before that. The IAP
stays `MISSING_METADATA` for the same reason: it needs a review screenshot of
the real paywall.

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
