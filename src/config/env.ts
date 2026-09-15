import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  puzzleApiUrl?: string;
  admob?: {
    iosBanner?: string;
    androidBanner?: string;
    iosInterstitial?: string;
    androidInterstitial?: string;
  };
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

/**
 * Google's own always-fillable test units. They are the default so that a
 * developer build never requests a live ad — serving live ads to a test device
 * is a policy violation, and an unset production id would otherwise fail
 * silently as a blank space.
 */
const TEST_BANNER = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const pick = (ios?: string, android?: string): string | undefined => {
  const value = Platform.select({ ios, android, default: undefined });
  // An unset variable arrives from CI as "" rather than undefined, and an empty string would
  // otherwise be treated as a configured unit id and requested as an ad.
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

/** Base URL of the puzzle Worker. Empty string means "offline only". */
export const PUZZLE_API_URL = extra.puzzleApiUrl ?? '';

/**
 * Environment first, then the values baked into app.json.
 *
 * The ids used to come only from `extra.admob`, which is committed and was empty -- so a store
 * build shipped Google's test units, served ads perfectly, and earned nothing. The portfolio's
 * EXPO_PUBLIC_ names are now the source of truth, `npm run check:release` refuses a build
 * without them, and the committed values stay as a fallback for older build profiles.
 */
export const BANNER_AD_UNIT_ID =
  pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER,
  ) ||
  pick(extra.admob?.iosBanner, extra.admob?.androidBanner) ||
  TEST_BANNER;

export const INTERSTITIAL_AD_UNIT_ID =
  pick(
    process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL,
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL,
  ) ||
  pick(extra.admob?.iosInterstitial, extra.admob?.androidInterstitial) ||
  TEST_INTERSTITIAL;

/** True when no real ad unit was configured, so the UI can say so in a dev build. */
export const USING_TEST_ADS =
  BANNER_AD_UNIT_ID === TEST_BANNER || INTERSTITIAL_AD_UNIT_ID === TEST_INTERSTITIAL;
