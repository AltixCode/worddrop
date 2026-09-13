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

const pick = (ios?: string, android?: string): string | undefined =>
  Platform.select({ ios, android, default: undefined });

/** Base URL of the puzzle Worker. Empty string means "offline only". */
export const PUZZLE_API_URL = extra.puzzleApiUrl ?? '';

export const BANNER_AD_UNIT_ID =
  pick(extra.admob?.iosBanner, extra.admob?.androidBanner) || TEST_BANNER;

export const INTERSTITIAL_AD_UNIT_ID =
  pick(extra.admob?.iosInterstitial, extra.admob?.androidInterstitial) || TEST_INTERSTITIAL;

/** True when no real ad unit was configured, so the UI can say so in a dev build. */
export const USING_TEST_ADS =
  BANNER_AD_UNIT_ID === TEST_BANNER || INTERSTITIAL_AD_UNIT_ID === TEST_INTERSTITIAL;
