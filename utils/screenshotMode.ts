import { Platform } from 'react-native';

import { getWebSearchParam } from '@/utils/webSearchParams';

export function useScreenshotParams() {
  const enabled =
    Platform.OS === 'web' &&
    (getWebSearchParam('screenshot') === '1' || getWebSearchParam('screenshot') === 'true');
  return { enabled };
}
