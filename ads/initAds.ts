import Constants from 'expo-constants';

import { APPODEAL_APP_KEY } from '@/constants/ads';
import { resolveAdNetwork, type AdNetwork } from '@/ads/resolveAdNetwork';

export function initAdsForNetwork(network: AdNetwork = resolveAdNetwork()): void {
  if (Constants.appOwnership === 'expo') return;

  if (network === 'yandex') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MobileAds } = require('yandex-mobile-ads');
      void Promise.resolve(MobileAds.initialize()).catch((error: unknown) => {
        console.warn('[Ads] Yandex initialize failed:', error);
      });
    } catch (error) {
      console.warn('[Ads] Yandex not available:', error);
    }
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-appodeal');
    const Appodeal = mod.default;
    const { AppodealAdType, AppodealLogLevel } = mod;
    if (Appodeal.isInitialized?.(AppodealAdType.BANNER)) return;
    if (__DEV__) {
      Appodeal.setTesting(true);
      Appodeal.setLogLevel?.(AppodealLogLevel.VERBOSE);
    } else {
      Appodeal.setTesting(false);
      Appodeal.setLogLevel?.(AppodealLogLevel.NONE);
    }
    Appodeal.initialize(APPODEAL_APP_KEY, AppodealAdType.BANNER);
    console.log('[Ads] Appodeal initialized (testing=', __DEV__, ')');
  } catch (error) {
    console.warn('[Ads] Appodeal initialize failed:', error);
  }
}
