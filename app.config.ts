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

const IOS_ADMOB_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID ?? 'ca-app-pub-3940256099942544~1458002511';
const ANDROID_ADMOB_APP_ID =
  process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID ?? 'ca-app-pub-3940256099942544~3347511713';

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
