import React from 'react';
import { Dimensions, View } from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

import { YANDEX_BANNER_AD_UNIT_ID } from '@/constants/ads';
import { useScreenshotParams } from '@/utils/screenshotMode';

type BannerViewProps = {
  size: unknown;
  adRequest: { adUnitId: string };
  onAdLoaded?: (event: { nativeEvent?: { adInfo?: unknown } }) => void;
  onAdFailedToLoad?: (event: { nativeEvent?: unknown }) => void;
};

export default function YandexBannerAd() {
  const shot = useScreenshotParams();
  const [adSize, setAdSize] = React.useState<unknown>(null);
  const [BannerViewComponent, setBannerViewComponent] =
    React.useState<React.ComponentType<BannerViewProps> | null>(null);
  const [ready, setReady] = React.useState(false);
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
    let cancelled = false;

    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { BannerAdSize, BannerView, MobileAds } = require('yandex-mobile-ads');
        await Promise.resolve(MobileAds.initialize());
        const size = await BannerAdSize.stickySize(Dimensions.get('window').width);
        if (cancelled) return;
        setAdSize(size);
        setBannerViewComponent(() => BannerView);
        setReady(true);
      } catch (error) {
        console.warn('[YandexAds] banner setup failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screenshotMode, isExpoGo, isConnected]);

  if (screenshotMode || isExpoGo || !isConnected) return null;
  if (!ready || !adSize || !BannerViewComponent) {
    return <View style={{ minHeight: 0 }} />;
  }

  const BannerViewComp = BannerViewComponent;
  return (
    <BannerViewComp
      size={adSize}
      adRequest={{ adUnitId: YANDEX_BANNER_AD_UNIT_ID }}
      onAdLoaded={() => {
        console.log('[YandexAds] banner loaded', YANDEX_BANNER_AD_UNIT_ID);
      }}
      onAdFailedToLoad={(event) => {
        console.warn('[YandexAds] banner failed', event?.nativeEvent);
      }}
    />
  );
}
