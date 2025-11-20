import React from 'react';

import { Pressable, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type HeaderProps = {
  onSettingsPress: () => void;
};

// test
const Header: React.FC<HeaderProps> = ({ onSettingsPress }) => {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.background,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: 24,
          fontWeight: 'bold',
        }}
      >
        {t('appName')}
      </Text>

      <Pressable
        onPress={onSettingsPress}
        style={({ pressed }) => [
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.button,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons name='settings-outline' size={24} color={theme.teal || theme.primary} />
      </Pressable>
    </View>
  );
};

export default Header;
