/**
 * Release identifier policy. Deliberately free of any React Native import so the build-time
 * check (`npm run check:release`) can run it under plain Node.
 */

/** Google's own test ad unit prefix. Shipping one of these earns nothing, silently. */
export const TEST_AD_UNIT_PREFIX = 'ca-app-pub-3940256099942544';

export function present(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Every identifier a store build must carry. A production build missing one does not crash --
 * it quietly falls back to Google's test ad units and earns nothing, which is the most
 * expensive failure mode this project has.
 */
export const RELEASE_ENV_KEYS = [
  'EXPO_PUBLIC_ADMOB_IOS_APP_ID',
  'EXPO_PUBLIC_ADMOB_ANDROID_APP_ID',
  'EXPO_PUBLIC_ADMOB_IOS_BANNER',
  'EXPO_PUBLIC_ADMOB_ANDROID_BANNER',
  'EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL',
  'EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL',
  'EXPO_PUBLIC_RC_IOS_KEY',
  'EXPO_PUBLIC_RC_ANDROID_KEY',
] as const;

/** Names the release identifiers that are absent, blank, or still a Google test unit. */
export function missingReleaseConfigFrom(env: Record<string, string | undefined>): string[] {
  return RELEASE_ENV_KEYS.filter((key) => {
    const value = env[key];
    if (!present(value)) return true;
    return value.startsWith(TEST_AD_UNIT_PREFIX);
  });
}
