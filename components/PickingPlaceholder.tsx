import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  picking: boolean;
  onPick: () => void;
};

const PickingPlaceholder = ({ picking, onPick }: Props) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  if (picking) {
    return (
      <View style={{ alignItems: 'center', gap: 12 }}>
        <ActivityIndicator size='large' color={theme.primary} />
        <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{t('loading')}</Text>
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPick}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          gap: 12,
        },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: theme.orange || theme.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 40 }}>＋</Text>
      </View>
      <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{t('selectImage')}</Text>
    </Pressable>
  );
};

export default PickingPlaceholder;
