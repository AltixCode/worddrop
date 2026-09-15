import { create } from 'zustand';

import type { ConsentState } from '../services/ads';

/**
 * The UMP consent state, in a store rather than a module variable.
 *
 * Consent resolves asynchronously, after the first render. A component reading it from a plain
 * getter would decide "no ads" on mount and never hear that consent arrived -- the banner
 * would stay missing until some unrelated state change happened to re-render it.
 */
interface AdsConsentStoreState {
  consent: ConsentState;
  setConsent: (consent: ConsentState) => void;
  resetForTests: () => void;
}

const INITIAL: ConsentState = {
  privacyOptionsRequired: false,
  personalised: false,
  canRequestAds: false,
};

export const useAdsConsentStore = create<AdsConsentStoreState>((set) => ({
  consent: INITIAL,
  setConsent: (consent) => set({ consent }),
  resetForTests: () => set({ consent: INITIAL }),
}));
