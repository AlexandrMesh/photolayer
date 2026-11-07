import React from 'react';
import { View } from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

import { initAdsForNetwork } from '@/ads/initAds';
import { useScreenshotParams } from '@/utils/screenshotMode';

type AppodealBannerProps = {
  adSize?: 'phone' | 'tablet';
  style?: object;
  onAdLoaded?: () => void;
  onAdFailedToLoad?: () => void;
};

export default function AppodealBannerAd() {
  const shot = useScreenshotParams();
  const [Banner, setBanner] = React.useState<React.ComponentType<AppodealBannerProps> | null>(
    null,
  );
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);

  const isExpoGo = Constants.appOwnership === 'expo';
  const screenshotMode = shot.enabled;

  React.useEffect(() => {
    if (screenshotMode) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });
    NetInfo.fetch().then((state) => setIsConnected(state.isConnected));
    return () => unsubscribe();
  }, [screenshotMode]);

  React.useEffect(() => {
    if (screenshotMode || isExpoGo || !isConnected) return;
    try {
      initAdsForNetwork('appodeal');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppodealBanner } = require('react-native-appodeal');
      setBanner(() => AppodealBanner);
    } catch (error) {
      console.warn('[Appodeal] banner setup failed', error);
    }
  }, [screenshotMode, isExpoGo, isConnected]);

  if (screenshotMode || isExpoGo || !isConnected) return null;
  if (!Banner) return <View style={{ minHeight: 0 }} />;

  return (
    <Banner
      adSize="phone"
      style={{ width: '100%', alignSelf: 'center' }}
      onAdLoaded={() => console.log('[Appodeal] banner loaded')}
      onAdFailedToLoad={() => console.warn('[Appodeal] banner failed')}
    />
  );
}
