import { Platform } from 'react-native';
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  InterstitialAd,
  AdEventType,
  MaxAdContentRating,
} from 'react-native-google-mobile-ads';
import { INTERSTITIAL_AD_UNIT_ID } from '../config/env';

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
};

let consentState: ConsentState = { privacyOptionsRequired: false, personalised: false };

export const getConsentState = (): ConsentState => consentState;

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
    personalised = Boolean(choices.selectPersonalisedAds);
    consentState = {
      privacyOptionsRequired: Boolean(
        (await AdsConsent.getGdprApplies?.()) ?? info.isConsentFormAvailable,
      ),
      personalised,
    };
  } catch (error) {
    // A consent failure must not grant personalised ads by default.
    console.warn('[Ads] Consent flow failed:', error);
    personalised = false;
    consentState = { privacyOptionsRequired: false, personalised: false };
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
    personalised = Boolean(choices.selectPersonalisedAds);
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
