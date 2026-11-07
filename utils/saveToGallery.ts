import { Platform } from 'react-native';

import Constants from 'expo-constants';
import * as MediaLibrary from 'expo-media-library';

/** Persist a local file to the gallery without READ_MEDIA_* (Play photo policy). */
export async function saveToGallery(uri: string): Promise<void> {
  const writeOnly = Platform.OS === 'android';
  const perm = await MediaLibrary.requestPermissionsAsync(writeOnly);
  if (!perm.granted) throw new Error('permission');

  if (Constants.appOwnership === 'expo') {
    await MediaLibrary.saveToLibraryAsync(uri);
    return;
  }

  await MediaLibrary.createAssetAsync(uri);
}
