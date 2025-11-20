import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type LanguageOption = {
  value: 'auto' | 'en' | 'ru';
  label: string;
  flag: string;
  description: string;
};

type LanguageSelectorProps = {
  currentLanguage: string;
  onLanguageSelect: (language: 'auto' | 'en' | 'ru') => void;
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageSelect }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  const languageOptions: LanguageOption[] = [
    {
      value: 'auto',
      label: t('auto'),
      flag: '🌐',
      description: 'Detect automatically',
    },
    {
      value: 'en',
      label: t('english'),
      flag: '🇺🇸',
      description: 'English',
    },
    {
      value: 'ru',
      label: t('russian'),
      flag: '🇷🇺',
      description: 'Русский',
    },
  ];

  return (
    <View style={{ gap: 12 }}>
      {languageOptions.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onLanguageSelect(option.value)}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 16,
              paddingHorizontal: 16,
              borderRadius: 12,
              backgroundColor: currentLanguage === option.value ? theme.primary + '20' : theme.button,
              borderWidth: 2,
              borderColor: currentLanguage === option.value ? theme.primary : theme.border,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentLanguage === option.value ? theme.primary : theme.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
          >
            <Text style={{ fontSize: 20 }}>{option.flag}</Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: currentLanguage === option.value ? theme.primary : theme.text,
                fontSize: 16,
                fontWeight: currentLanguage === option.value ? '600' : '500',
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

          {currentLanguage === option.value && (
            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </Pressable>
      ))}
    </View>
  );
};

export default LanguageSelector;
