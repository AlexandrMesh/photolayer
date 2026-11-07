import React from 'react';

import { resolveAdNetwork } from '@/ads/resolveAdNetwork';
import AppodealBannerAd from '@/components/AppodealBannerAd';
import YandexBannerAd from '@/components/YandexBannerAd';

/** Sticky banner: Yandex for RU locales, Appodeal otherwise. */
const BannerAd: React.FC = () => {
  const network = resolveAdNetwork();
  if (network === 'yandex') return <YandexBannerAd />;
  return <AppodealBannerAd />;
};

export default BannerAd;
