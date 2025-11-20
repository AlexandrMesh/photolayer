import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../contexts/ThemeContext';

type SettingItemProps = {
  title: string;
  value: string;
  onPress: () => void;
  icon: string;
};

const SettingItem: React.FC<SettingItemProps> = ({ title, value, onPress, icon }) => {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 16,
          paddingHorizontal: 20,
          backgroundColor: theme.card,
          borderRadius: 12,
          marginBottom: 12,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <Ionicons name={icon as any} size={24} color={theme.primary} style={{ marginRight: 16 }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>{title}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 2 }}>{value}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
};

export default SettingItem;
