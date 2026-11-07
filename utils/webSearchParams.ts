import { Platform } from 'react-native';

/** Safe web-only search param — never touch window.location on native. */
export function getWebSearchParam(key: string): string | null {
  if (Platform.OS !== 'web') return null;
  try {
    return globalThis?.window?.location?.search
      ? new URLSearchParams(globalThis.window.location.search).get(key)
      : null;
  } catch {
    return null;
  }
}
