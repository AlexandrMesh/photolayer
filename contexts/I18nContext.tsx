import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import * as Localization from 'expo-localization';

// Импорт переводов
import enTranslations from '../locales/en';
import ruTranslations from '../locales/ru';

type Language = 'ru' | 'en' | 'auto';

type Translations = {
  appName: string;
  basePhoto: string;
  addBasePhoto: string;
  replaceBasePhoto: string;
  addOverlay: string;
  replaceOverlay: string;
  removeOverlay: string;
  resetOverlay: string;
  overlay: string;
  overlayHint: string;
  selectBaseImage: string;
  rotation: string;
  reset: string;
  loading: string;
  selectImage: string;
  save: string;
  saving: string;
  saved: string;
  savedMessage: string;
  selectPhotoForRotation: string;
  settings: string;
  theme: string;
  language: string;
  feedback: string;
  appVersion: string;
  sendFeedback: string;
  chooseTheme: string;
  chooseLanguage: string;
  auto: string;
  light: string;
  dark: string;
  english: string;
  russian: string;
  updates: string;
  checking: string;
  checkForUpdates: string;
  updateNow: string;
  updatesTitle: string;
  updatesDescription: string;
  check: string;
  update: string;
  updateAvailable: string;
  noUpdateAvailable: string;
  currentVersion: string;
  checkForUpdatesBelow: string;
  layers: string;
  layer: string;
  noLayers: string;
  addLayerHint: string;
  opacity: string;
  size: string;
  angle: string;
};

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const translations: Record<'ru' | 'en', Translations> = {
  ru: ruTranslations,
  en: enTranslations,
};

// Функция для определения языка на основе локали
const detectLanguage = (): 'ru' | 'en' => {
  const locale = Localization.getLocales()[0]?.languageCode || 'en';

  // Проверяем, начинается ли локаль с 'ru' (ru_RU, ru_BY, ru_UA и т.д.)
  if (locale.startsWith('ru')) {
    return 'ru';
  }

  // Во всех остальных случаях возвращаем английский
  return 'en';
};

type I18nProviderProps = {
  children: ReactNode;
};

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('auto');

  const getCurrentLanguage = (): 'ru' | 'en' => {
    if (language === 'auto') {
      return detectLanguage();
    }
    return language;
  };

  const t = useMemo(() => {
    return (key: keyof Translations): string => {
      const currentLang = getCurrentLanguage();
      return translations[currentLang][key] || key;
    };
  }, [language, getCurrentLanguage]);

  const value: I18nContextType = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
