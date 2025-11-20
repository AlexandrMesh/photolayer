import React from 'react';

import { Pressable, Text } from 'react-native';

import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = () => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();

  const cycleTheme = () => {
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const getThemeLabel = () => {
    if (themeMode === 'system') {
      return `System (${isDark ? 'Dark' : 'Light'})`;
    }
    return themeMode === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <Pressable
      onPress={cycleTheme}
      style={({ pressed }) => [
        {
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 8,
          backgroundColor: theme.button,
          borderWidth: 1,
          borderColor: theme.border,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>{getThemeLabel()}</Text>
    </Pressable>
  );
};

export default ThemeToggle;
