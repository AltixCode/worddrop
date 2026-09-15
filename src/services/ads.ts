import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  InterstitialAd,
  AdEventType,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';
import { INTERSTITIAL_AD_UNIT_ID } from '../config/env';
import { useAdsConsentStore } from '../store/useAdsConsentStore';

/**
 * Ads exist so the game can be free; the lifetime unlock removes them. Every
 * entry point here checks the Pro flag first, so an unlocked player never
 * initialises the SDK, never requests an ad, and never sees a consent form.
 */

let started = false;
let startPromise: Promise<boolean> | null = null;
let personalised = false;

export type ConsentState = {
  /** Whether a consent form is available to show again from Settings. */
  privacyOptionsRequired: boolean;
  personalised: boolean;
  /**
   * Whether UMP permits an ad request at all.
   *
   * Distinct from `personalised`: a player in the EEA who refuses consent outright must have
   * *no* ad requested on their behalf, not a non-personalised one. Defaults to false so a
   * consent flow that throws cannot be read as permission.
   */
  canRequestAds: boolean;
};

let consentState: ConsentState = {
  privacyOptionsRequired: false,
  personalised: false,
  canRequestAds: false,
};

function applyConsent(next: ConsentState): void {
  consentState = next;
  personalised = next.personalised;
  // Published to the store as well, so the banner re-renders when consent resolves.
  useAdsConsentStore.getState().setConsent(next);
  if (__DEV__) console.log('[ads] consent', JSON.stringify(next));
}

export const getConsentState = (): ConsentState => consentState;

/**
 * The iOS App Tracking Transparency prompt.
 *
 * Without it the IDFA is unavailable, so Apple's own frame for "tracking" is never satisfied
 * and personalised ads cannot be served on iOS at all. It was missing: the plugin and the
 * Info.plist string were in place, nothing ever asked, and both the store listing and the
 * privacy policy said the prompt is shown — a claim the binary did not honour.
 *
 * Asked after the UMP form, which is the order Google documents: consent first, then tracking.
 * A refusal is not an error — it means non-personalised ads, and the game is identical either
 * way.
 */
async function requestAppTracking(): Promise<boolean> {
  if (Platform.OS !== 'ios') return true;
  try {
    const current = await getTrackingPermissionsAsync();
    if (current.status === 'granted') return true;
    if (current.status === 'undetermined' && current.canAskAgain) {
      const asked = await requestTrackingPermissionsAsync();
      return asked.status === 'granted';
    }
    return false;
  } catch (error) {
    console.warn('[Ads] Tracking permission request failed:', error);
    return false;
  }
}

/**
 * Gathers consent under Google's UMP, then starts the SDK.
 *
 * Consent must be resolved *before* the first ad request in the EEA and UK, and
 * the app defaults to non-personalised ads until a player says otherwise —
 * a wrong default here is both a policy breach and a data-protection one.
 */
async function gatherConsent(): Promise<void> {
  try {
    const info = await AdsConsent.requestInfoUpdate();
    if (
      info.isConsentFormAvailable &&
      info.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
    const choices = await AdsConsent.getUserChoices();
    // Re-read after the form, so the answer the player just gave is what is recorded.
    const settled = await AdsConsent.getConsentInfo();
    applyConsent({
      privacyOptionsRequired: Boolean(
        (await AdsConsent.getGdprApplies?.()) ?? info.isConsentFormAvailable,
      ),
      personalised: Boolean(choices.selectPersonalisedAds),
      canRequestAds: settled.canRequestAds === true,
    });
  } catch (error) {
    // A consent failure must not grant ads, personalised or otherwise.
    console.warn('[Ads] Consent flow failed:', error);
    applyConsent({
      privacyOptionsRequired: false,
      personalised: false,
      canRequestAds: false,
    });
  }
}

/** Idempotent; safe to call from several screens. Never blocks the first frame. */
export async function initAds(isPro: boolean): Promise<boolean> {
  if (isPro) return false;
  if (started) return true;
  if (startPromise) return startPromise;

  startPromise = (async () => {
    try {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
      });
      await gatherConsent();
      if (!consentState.canRequestAds) {
        // No consent, no ad requests. The game plays exactly the same without them.
        return false;
      }
      // Personalisation needs both: UMP consent *and* iOS tracking authorisation.
      const trackingAllowed = await requestAppTracking();
      if (!trackingAllowed && consentState.personalised) {
        applyConsent({ ...consentState, personalised: false });
      }
      await mobileAds().initialize();
      started = true;
      return true;
    } catch (error) {
      console.warn('[Ads] Initialisation failed:', error);
      return false;
    } finally {
      startPromise = null;
    }
  })();

  return startPromise;
}

/** Re-opens the privacy options form from Settings, where regulation requires it. */
export async function showPrivacyOptions(): Promise<boolean> {
  try {
    await AdsConsent.showPrivacyOptionsForm();
    const choices = await AdsConsent.getUserChoices();
    const settled = await AdsConsent.getConsentInfo();
    applyConsent({
      ...consentState,
      personalised: Boolean(choices.selectPersonalisedAds),
      canRequestAds: settled.canRequestAds === true,
    });
    return true;
  } catch (error) {
    console.warn('[Ads] Privacy options form failed:', error);
    return false;
  }
}

export const requestNonPersonalized = (): boolean => !personalised;

/**
 * Shows the single daily interstitial.
 *
 * Resolves either way and never throws: a failed ad load must not block the
 * player from seeing their own result. The caller decides when a day's ad has
 * already been shown — this function only loads and presents one.
 */
export function showInterstitial(isPro: boolean): Promise<boolean> {
  if (isPro || Platform.OS === 'web') return Promise.resolve(false);
  if (!consentState.canRequestAds) return Promise.resolve(false);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      unsubLoaded();
      unsubClosed();
      unsubError();
      resolve(shown);
    };

    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: requestNonPersonalized(),
    });

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      try {
        ad.show();
      } catch (error) {
        console.warn('[Ads] Interstitial could not be shown:', error);
        finish(false);
      }
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.warn('[Ads] Interstitial failed to load:', error);
      finish(false);
    });

    // Nobody waits ten seconds to see whether they kept their streak.
    const timer = setTimeout(() => finish(false), 8000);

    ad.load();
  });
}
