import * as Localization from 'expo-localization';

export type AdNetwork = 'yandex' | 'appodeal';

/**
 * Primary device locale only (not VPN, not in-app language).
 * RU language or RU region → Yandex; else Appodeal.
 */
export function resolveAdNetwork(): AdNetwork {
  const primary = Localization.getLocales()[0];
  const lang = (primary?.languageCode ?? '').toLowerCase();
  const region = (primary?.regionCode ?? '').toUpperCase();
  if (lang === 'ru' || region === 'RU') return 'yandex';
  return 'appodeal';
}
