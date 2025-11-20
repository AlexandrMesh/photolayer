import { Linking, Platform } from 'react-native';

import * as Updates from 'expo-updates';

type CheckUpdateOptions = { flexible?: boolean };

const ANDROID_PACKAGE = 'com.photolayer';

const openStorePage = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'android') {
      const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
      const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
      const canOpen = await Linking.canOpenURL(marketUrl);
      await Linking.openURL(canOpen ? marketUrl : webUrl);
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const checkAndMaybeUpdate = async (options?: CheckUpdateOptions): Promise<boolean> => {
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    const flexible = options?.flexible ?? true;
    if (flexible) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      return true;
    }
    // "Immediate" path: fetch and reload right away
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    // If OTA not available, try opening store page (Android)
    return await openStorePage();
  }
};

export const triggerImmediateUpdate = async (): Promise<boolean> => {
  try {
    const result = await Updates.checkForUpdateAsync();
    if (!result.isAvailable) return false;
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return await openStorePage();
  }
};

export const checkUpdateAvailable = async (): Promise<boolean> => {
  try {
    const result = await Updates.checkForUpdateAsync();
    return !!result.isAvailable;
  } catch {
    return false;
  }
};

export const startFlexibleUpdate = async (): Promise<boolean> => {
  try {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return true;
  } catch {
    return await openStorePage();
  }
};
