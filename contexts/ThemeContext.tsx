import React, { createContext, ReactNode, useContext, useState } from 'react';

import { Appearance } from 'react-native';

import { ColorScheme, darkColors, lightColors } from '../themes/colors';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  theme: ColorScheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Функция для определения темы на основе системных настроек
const getSystemTheme = (): 'light' | 'dark' => {
  const systemColorScheme = Appearance.getColorScheme();
  return systemColorScheme === 'dark' ? 'dark' : 'light';
};

// Функция для получения актуальной темы
const getCurrentTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme();
  }
  return mode;
};

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // Получаем актуальную тему
  const currentTheme = getCurrentTheme(themeMode);
  const theme = currentTheme === 'dark' ? darkColors : lightColors;
  const isDark = currentTheme === 'dark';

  const value: ThemeContextType = {
    theme,
    themeMode,
    setThemeMode,
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
