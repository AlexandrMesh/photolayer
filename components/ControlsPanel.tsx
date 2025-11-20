import { Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';

import PrimaryButton from '../components/PrimaryButton';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  hasBaseImage: boolean;
  hasOverlayImage: boolean;
  overlayRotation: number;
  onPickBase: () => void;
  onPickOverlay: () => void;
  onRemoveOverlay: () => void;
  onResetOverlay: () => void;
  onRotateOverlay: (delta: number) => void;
  saving: boolean;
  onSave: () => void;
};

const ControlsPanel = ({
  hasBaseImage,
  hasOverlayImage,
  overlayRotation,
  onPickBase,
  onPickOverlay,
  onRemoveOverlay,
  onResetOverlay,
  onRotateOverlay,
  saving,
  onSave,
}: Props) => {
  const { t } = useI18n();
  const { theme } = useTheme();

  const baseLabel = hasBaseImage ? t('replaceBasePhoto') : t('addBasePhoto');
  const overlayLabel = hasOverlayImage ? t('replaceOverlay') : t('addOverlay');

  return (
    <View style={{ gap: 12 }}>
      <PrimaryButton label={baseLabel} onPress={onPickBase} style={{ width: '100%' }} />

      {hasBaseImage && (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <PrimaryButton label={overlayLabel} onPress={onPickOverlay} style={{ flex: 1 }} />
            <PrimaryButton label={t('removeOverlay')} onPress={onRemoveOverlay} disabled={!hasOverlayImage} style={{ flex: 1 }} />
          </View>

          {hasOverlayImage && (
            <View
              style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>{t('overlay')}</Text>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>{Math.round(overlayRotation)}°</Text>
              </View>
              <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{t('overlayHint')}</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <PrimaryButton onPress={() => onRotateOverlay(-5)}>
                  <MaterialCommunityIcons name='rotate-left' size={24} color='white' />
                </PrimaryButton>
                <PrimaryButton onPress={() => onRotateOverlay(5)}>
                  <MaterialCommunityIcons name='rotate-right' size={24} color='white' />
                </PrimaryButton>
                <PrimaryButton label={t('resetOverlay')} onPress={onResetOverlay} style={{ flex: 1 }} />
              </View>
            </View>
          )}

          <PrimaryButton label={saving ? t('saving') : t('save')} onPress={onSave} disabled={saving} style={{ width: '100%' }} />
        </>
      )}
    </View>
  );
};

export default ControlsPanel;
