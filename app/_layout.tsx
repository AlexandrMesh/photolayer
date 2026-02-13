import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Constants from 'expo-constants';
import BannerAd from '../components/BannerAd';
import { I18nProvider } from '../contexts/I18nContext';
import { ThemeProvider } from '../contexts/ThemeContext';

const RootLayout = () => {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (!isExpoGo) {
      import('yandex-mobile-ads')
        .then(({ MobileAds }) => MobileAds.initialize())
        .catch((error) => console.warn('Yandex Mobile Ads not available:', error));
    }
  }, []);

  return (
    <ThemeProvider>
      <I18nProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>
            <Stack>
              <Stack.Screen name='index' options={{ headerShown: false }} />
              <Stack.Screen name='settings' options={{ headerShown: false }} />
            </Stack>
          </View>
          <View style={{ paddingBottom: insets.bottom }}>
            <BannerAd />
          </View>
        </GestureHandlerRootView>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default RootLayout;
