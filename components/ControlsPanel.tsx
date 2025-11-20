import { Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

import PrimaryButton from '../components/PrimaryButton';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  angle: number;
  angleInput: string;
  onAngleInputChange: (text: string) => void;
  onAngleCommit: () => void;
  onReset: () => void;
  onAngleChange: (value: number) => void;
  onSliderCommit: (value: number) => void;
  onPickAnother: () => void;
  saving: boolean;
  onSave: () => void;
};

const ControlsPanel = ({
  angle,
  angleInput,
  onAngleInputChange,
  onAngleCommit,
  onReset,
  onAngleChange,
  onSliderCommit,
  onPickAnother: _onPickAnother,
  saving,
  onSave,
}: Props) => {
  const { t } = useI18n();
  const { theme } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 16 }}>{t('rotation')}</Text>
          <Pressable
            onPress={() => onAngleChange(Math.max(-180, angle - 1))}
            disabled={angle <= -180}
            style={({ pressed }) => [
              {
                height: 40,
                minWidth: 40,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: theme.button,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: angle <= -180 ? theme.textSecondary : theme.primary, fontSize: 16, fontWeight: '600' }}>−</Text>
          </Pressable>
          <View
            style={{
              height: 40,
              paddingHorizontal: 10,
              minWidth: 70,
              borderRadius: 8,
              backgroundColor: theme.input,
              borderWidth: 1,
              borderColor: theme.inputBorder,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <Text style={{ color: theme.text, fontSize: 16 }}>{angle}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>°</Text>
          </View>
          <Pressable
            onPress={() => onAngleChange(Math.min(180, angle + 1))}
            disabled={angle >= 180}
            style={({ pressed }) => [
              {
                height: 40,
                minWidth: 40,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: theme.button,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: angle >= 180 ? theme.textSecondary : theme.primary, fontSize: 16, fontWeight: '600' }}>+</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              {
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 6,
                backgroundColor: theme.button,
                borderWidth: 1,
                borderColor: theme.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '500' }}>{t('reset')}</Text>
          </Pressable>
        </View>
      </View>
      <View style={{ marginVertical: 8 }}>
        <Slider
          minimumValue={-180}
          maximumValue={180}
          value={angle}
          step={1}
          onValueChange={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            onAngleChange(next);
          }}
          onSlidingComplete={(v) => {
            const next = Array.isArray(v) ? v[0] : v;
            onSliderCommit(next);
          }}
          minimumTrackTintColor={theme.sliderMin}
          maximumTrackTintColor={theme.sliderMax}
          thumbTintColor={theme.sliderThumb}
        />
        {/* Метки шкалы */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Pressable onPress={() => onAngleChange(-180)}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: angle === -180 ? theme.primary : theme.textSecondary,
                  fontSize: 10,
                  fontWeight: '500',
                  marginBottom: 1,
                }}
              >
                −
              </Text>
              <Text
                style={{
                  color: angle === -180 ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                  fontWeight: angle === -180 ? '600' : '500',
                }}
              >
                180
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onAngleChange(-90)}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: angle === -90 ? theme.primary : theme.textSecondary,
                  fontSize: 10,
                  fontWeight: '500',
                  marginBottom: 1,
                }}
              >
                −
              </Text>
              <Text
                style={{
                  color: angle === -90 ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                  fontWeight: angle === -90 ? '600' : '500',
                }}
              >
                90
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onAngleChange(0)}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: angle === 0 ? theme.primary : theme.text,
                  fontSize: 16,
                  fontWeight: angle === 0 ? '600' : '600',
                }}
              >
                0
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onAngleChange(90)}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: angle === 90 ? theme.primary : theme.textSecondary,
                  fontSize: 10,
                  fontWeight: '500',
                  marginBottom: 1,
                }}
              >
                +
              </Text>
              <Text
                style={{
                  color: angle === 90 ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                  fontWeight: angle === 90 ? '600' : '500',
                }}
              >
                90
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => onAngleChange(180)}>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  color: angle === 180 ? theme.primary : theme.textSecondary,
                  fontSize: 10,
                  fontWeight: '500',
                  marginBottom: 1,
                }}
              >
                +
              </Text>
              <Text
                style={{
                  color: angle === 180 ? theme.primary : theme.textSecondary,
                  fontSize: 14,
                  fontWeight: angle === 180 ? '600' : '500',
                }}
              >
                180
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <PrimaryButton onPress={() => onAngleChange(angle - 90)} disabled={angle <= -180}>
          <MaterialCommunityIcons name='rotate-left' size={22} color={angle <= -180 ? theme.textSecondary : 'white'} />
        </PrimaryButton>
        <PrimaryButton onPress={() => onAngleChange(angle + 90)} disabled={angle >= 180}>
          <MaterialCommunityIcons name='rotate-right' size={22} color={angle >= 180 ? theme.textSecondary : 'white'} />
        </PrimaryButton>
        <PrimaryButton label={saving ? t('saving') : t('save')} onPress={onSave} disabled={saving} style={{ flex: 1 }} />
      </View>
    </View>
  );
};

export default ControlsPanel;
