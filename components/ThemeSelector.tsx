import React from 'react';

import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type ThemeOption = {
  value: 'system' | 'light' | 'dark';
  label: string;
  icon: string;
  description: string;
};

type ThemeSelectorProps = {
  currentTheme: string;
  onThemeSelect: (theme: 'system' | 'light' | 'dark') => void;
};

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeSelect }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  const themeOptions: ThemeOption[] = [
    {
      value: 'system',
      label: t('auto'),
      icon: 'phone-portrait-outline',
      description: 'Follow system settings',
    },
    {
      value: 'light',
      label: t('light'),
      icon: 'sunny-outline',
      description: 'Light theme',
    },
    {
      value: 'dark',
      label: t('dark'),
      icon: 'moon-outline',
      description: 'Dark theme',
    },
  ];

  return (
    <View style={{ gap: 12 }}>
      {themeOptions.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onThemeSelect(option.value)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: currentTheme === option.value ? theme.primary + '20' : theme.button,
              borderWidth: 2,
              borderColor: currentTheme === option.value ? theme.primary : theme.border,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentTheme === option.value ? theme.primary : theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Ionicons name={option.icon as any} size={20} color={currentTheme === option.value ? 'white' : theme.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: currentTheme === option.value ? theme.primary : theme.text,
                fontSize: 16,
                fontWeight: currentTheme === option.value ? '600' : '500',
              }}
            >
              {option.label}
            </Text>
            <Text
              style={{
                color: theme.textSecondary,
                fontSize: 14,
                marginTop: 2,
              }}
            >
              {option.description}
            </Text>
          </View>

          {currentTheme === option.value && <Ionicons name='checkmark-circle' size={24} color={theme.primary} />}
        </Pressable>
      ))}
    </View>
  );
};

export default ThemeSelector;
