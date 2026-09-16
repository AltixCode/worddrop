import { Platform } from 'react-native';
import Purchases, { PurchasesPackage, LOG_LEVEL } from 'react-native-purchases';

/**
 * The RevenueCat entitlement one purchase grants: no ads, and the archive open.
 *
 * This string must match the entitlement's lookup key in the WordDrop RevenueCat project
 * (`proje05b0359`) exactly, which is **`pro`** — `rc entitlements list` is the authority. A
 * mismatch does not fail loudly: the purchase completes at the store, `customerInfo` carries an
 * entitlement under a different key, `hasPro` finds nothing, and the player pays for an unlock
 * that never arrives. (`remove_ads` is BlockJam's key, not this project's.)
 */
const ENTITLEMENT_ID = 'pro';

/**
 * Keys are public client keys by design, but they still come from the
 * environment so a fork of the repo cannot accidentally sell through this
 * project's RevenueCat app.
 */
const RC_API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY,
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
});

/**
 * A boolean cannot distinguish "the store said no" from "we never reached the
 * store", and collapsing them forces the UI either to nag after a deliberate
 * cancel or to grant the unlock during an outage. The caller gets the reason.
 */
export type PurchaseOutcome =
  | { status: 'unlocked' }
  | { status: 'cancelled' }
  | { status: 'no_entitlement' }
  | { status: 'store_unavailable' }
  | { status: 'failed'; message?: string };

let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

const hasPro = (info: { entitlements: { active: Record<string, unknown> } }): boolean =>
  info.entitlements.active[ENTITLEMENT_ID] !== undefined;

/** Configures the SDK exactly once; concurrent callers await the same attempt. */
export const initPurchases = async (): Promise<boolean> => {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (!RC_API_KEY) return false;
      // Silence the SDK's own logs while capturing store screenshots.
      //
      // RevenueCat logs at WARN with a distinctive prefix, and in a DEBUG build
      // -- which every capture is -- each one becomes a LogBox toast docked at
      // the bottom of the screen. Four apps shipped IAP review screenshots with
      // that toast covering the buy button, and one (scanlit) with a toast at
      // almost exactly the app's own luminance, which no pixel check can see.
      //
      // The warnings are useful in ordinary development, so this silences them
      // only under the capture flag, and __DEV__ keeps it inert in anything
      // that ships.
      const capturing = __DEV__ && process.env.EXPO_PUBLIC_CAPTURE_MODE === '1';
      Purchases.setLogLevel(capturing ? LOG_LEVEL.ERROR : LOG_LEVEL.WARN);
      await Purchases.configure({ apiKey: RC_API_KEY });
      isInitialized = true;
      return true;
    } catch (error) {
      console.warn('[Purchases] Configuration failed:', error);
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
};

/**
 * The lifetime package from the live offering, or null when the catalogue is
 * unreachable. The paywall renders `product.priceString` from this — a price
 * baked into a translated string would show US dollars worldwide and is a
 * direct App Review rejection.
 */
export const getLifetimePackage = async (): Promise<PurchasesPackage | null> => {
  if (!(await initPurchases())) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return (
      offerings.current?.lifetime ?? offerings.current?.availablePackages?.[0] ?? null
    );
  } catch (error) {
    console.warn('[Purchases] Could not load offerings:', error);
    return null;
  }
};

export const purchaseLifetime = async (): Promise<PurchaseOutcome> => {
  if (!(await initPurchases())) return { status: 'store_unavailable' };

  let pkg: PurchasesPackage | null;
  try {
    pkg = await getLifetimePackage();
  } catch {
    return { status: 'store_unavailable' };
  }
  if (!pkg) return { status: 'store_unavailable' };

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return hasPro(customerInfo) ? { status: 'unlocked' } : { status: 'no_entitlement' };
  } catch (error) {
    const err = error as { userCancelled?: boolean; message?: string };
    if (err.userCancelled) return { status: 'cancelled' };
    console.warn('[Purchases] Purchase failed:', error);
    return { status: 'failed', message: err.message };
  }
};

export const restorePurchases = async (): Promise<PurchaseOutcome> => {
  if (!(await initPurchases())) return { status: 'store_unavailable' };
  try {
    const customerInfo = await Purchases.restorePurchases();
    return hasPro(customerInfo) ? { status: 'unlocked' } : { status: 'no_entitlement' };
  } catch (error) {
    console.warn('[Purchases] Restore failed:', error);
    return { status: 'failed', message: (error as { message?: string }).message };
  }
};

/**
 * Resolves false whenever the entitlement cannot be confirmed, the store
 * included. RevenueCat serves a cached CustomerInfo offline, so a player who
 * has opened the app once since buying stays unlocked on a flight.
 */
export const checkIsPro = async (): Promise<boolean> => {
  if (!(await initPurchases())) return false;
  try {
    return hasPro(await Purchases.getCustomerInfo());
  } catch {
    return false;
  }
};
