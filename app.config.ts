import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Native configuration that has to come from the environment.
 *
 * Everything static stays in `app.json`; this file only layers on what differs between a
 * developer build and a store build. AdMob *app* ids are baked into the native manifests, so
 * they cannot be read from JS at runtime -- they must be resolved here, and app.json had
 * Google's test ids committed in their place.
 *
 * They are public identifiers rather than secrets, but they still come from the environment so
 * a developer build can never ship with production ad units. `npm run check:release` is what
 * stops the test fallback from reaching the stores.
 */

// `||`, never `??`, for an identifier that must not be empty.
//
// A GitHub Actions env var mapped from a missing secret arrives as an EMPTY
// STRING, not undefined -- and `??` keeps an empty string. That ships
// `GADApplicationIdentifier = ""`, which makes the Google Mobile Ads SDK raise
// at startup: the app dies on launch, and Apple rejects it for crashing. Four
// apps in this portfolio were rejected for exactly that, which is why
// `attach-verified-build.py` reads the binary before attaching it to a version.
// `||` falls back on the empty string too, so the test identifier is used and
// the app starts.
const IOS_ADMOB_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || 'ca-app-pub-3940256099942544~1458002511';
const ANDROID_ADMOB_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || 'ca-app-pub-3940256099942544~3347511713';

export default ({ config }: ConfigContext): ExpoConfig => {
  // The ads plugin is already configured in app.json with the test app ids. Replacing the
  // entry rather than appending avoids a duplicate plugin, which Expo resolves last-one-wins
  // -- silently, and in whichever order the array happens to be in.
  const plugins = (config.plugins ?? []).map((plugin) => {
    const name = typeof plugin === 'string' ? plugin : plugin?.[0];
    if (name !== 'react-native-google-mobile-ads') return plugin;
    const options = (typeof plugin === 'string' ? {} : (plugin[1] ?? {})) as Record<
      string,
      unknown
    >;
    return [
      'react-native-google-mobile-ads',
      { ...options, androidAppId: ANDROID_ADMOB_APP_ID, iosAppId: IOS_ADMOB_APP_ID },
    ] as [string, Record<string, unknown>];
  });

  return {
    ...config,
    name: config.name ?? 'WordDrop',
    slug: config.slug ?? 'worddrop',
    plugins,
  };
};
