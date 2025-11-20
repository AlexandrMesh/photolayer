import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { I18nProvider } from '../contexts/I18nContext';
import { ThemeProvider } from '../contexts/ThemeContext';

const RootLayout = () => {
  return (
    <ThemeProvider>
      <I18nProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name='index' options={{ headerShown: false }} />
          <Stack.Screen name='settings' options={{ headerShown: false }} />
        </Stack>
        </GestureHandlerRootView>
      </I18nProvider>
    </ThemeProvider>
  );
};

export default RootLayout;
