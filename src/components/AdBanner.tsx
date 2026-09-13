import React, { useState } from 'react';
import { View } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT_ID } from '../config/env';
import { requestNonPersonalized } from '../services/ads';
import { useGameStore } from '../store/useGameStore';

/**
 * The banner renders only for players who have not bought the unlock, and
 * collapses to nothing when an ad fails to load — an empty reserved strip looks
 * like a layout bug, and reserving space for an ad that never arrives wastes
 * screen on the smallest devices.
 */
export const AdBanner: React.FC = () => {
  const isPro = useGameStore((s) => s.isPro);
  const [failed, setFailed] = useState(false);

  if (isPro || failed) return null;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      <BannerAd
        unitId={BANNER_AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: requestNonPersonalized() }}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
};
