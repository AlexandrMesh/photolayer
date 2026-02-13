import React from 'react';

import { Dimensions, View } from 'react-native';

import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

const BannerAd: React.FC = () => {
  const [adSize, setAdSize] = React.useState<any>(null);
  const [BannerViewComponent, setBannerViewComponent] = React.useState<any>(null);
  const [adRequest, setAdRequest] = React.useState<any>(null);
  const [isConnected, setIsConnected] = React.useState<boolean | null>(null);

  const isExpoGo = Constants.appOwnership === 'expo';

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected);
    });

    NetInfo.fetch().then((state) => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!isExpoGo && isConnected) {
      (async () => {
        try {
          const { AdRequest, AdTheme, BannerAdSize, BannerView, Gender, Location } = await import('yandex-mobile-ads');

          const request = new AdRequest({
            age: '20',
            contextQuery: 'context-query',
            contextTags: ['context-tag'],
            gender: Gender.Male,
            location: new Location(55.734202, 37.588063),
            adTheme: AdTheme.Dark,
            parameters: new Map<string, string>([
              ['param1', 'value1'],
              ['param2', 'value2'],
            ]),
          });

          const size = await BannerAdSize.stickySize(Dimensions.get('window').width);

          setAdRequest(request);
          setAdSize(size);
          setBannerViewComponent(() => BannerView);
        } catch (error) {
          // yandex-mobile-ads not available in Expo Go
        }
      })();
    } else {
      setAdSize(null);
      setBannerViewComponent(null);
      setAdRequest(null);
    }
  }, [isExpoGo, isConnected]);

  if (isExpoGo || !isConnected || !adSize || !BannerViewComponent || !adRequest) {
    return <View />;
  }

  const BannerViewComp = BannerViewComponent;

  return (
    <BannerViewComp
      size={adSize}
      adUnitId="R-M-18722257-1"
      adRequest={adRequest}
      onAdLoaded={() => {}}
      onAdFailedToLoad={() => {}}
      onAdClicked={() => {}}
      onLeftApplication={() => {}}
      onReturnToApplication={() => {}}
      onAdImpression={() => {}}
      onAdClose={() => {}}
    />
  );
};

export default BannerAd;
