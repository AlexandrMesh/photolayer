import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { BackHandler, FlatList, Image, Pressable, Text, View, type GestureResponderEvent } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import type { ColorScheme } from '../themes/colors';

import type { Layer, LayerTransform } from './ImageCanvas';

type Props = {
  visible: boolean;
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
  onRemoveLayer: (layerId: string) => void;
  onUpdateLayerTransform: (layerId: string, transform: Partial<LayerTransform>) => void;
  onClose: () => void;
  onAddLayer: () => void;
};

type LayerControlSliderProps = {
  label: string;
  displayValue: string;
  value: number;
  min: number;
  max: number;
  step: number;
  buttonStep?: number;
  defaultValue: number;
  resetLabel: string;
  onChange: (value: number) => void;
  theme: ColorScheme;
};

const LayerControlSlider = ({
  label,
  displayValue,
  value,
  min,
  max,
  step,
  buttonStep,
  defaultValue,
  resetLabel,
  onChange,
  theme,
}: LayerControlSliderProps) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const panStart = useRef(0);
  const TRACK_HEIGHT = 10;
  const THUMB_SIZE = 26;
  const THUMB_RADIUS = THUMB_SIZE / 2;

  const range = max - min || 1;
  const normalized = Math.max(0, Math.min(1, (value - min) / range));
  const fillPercent = normalized * 100;
  const thumbPosition = trackWidth ? normalized * trackWidth : 0;
  const buttonDelta = buttonStep ?? step;
  const isAtDefault = Math.abs(value - defaultValue) < step / 2;

  const applyValue = useCallback(
    (nextValue: number) => {
      if (Number.isNaN(nextValue)) return;
      const clamped = Math.max(min, Math.min(max, nextValue));
      const stepped = Math.round(clamped / step) * step;
      onChange(Number(stepped.toFixed(3)));
    },
    [min, max, step, onChange],
  );

  const updateFromPosition = useCallback(
    (position: number) => {
      if (!trackWidth || max === min) return;
      const safePosition = Math.max(0, Math.min(trackWidth, position));
      const ratio = safePosition / trackWidth;
      const rawValue = min + ratio * (max - min);
      applyValue(rawValue);
    },
    [trackWidth, min, max, applyValue],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          panStart.current = trackWidth ? normalized * trackWidth : 0;
        })
        .onUpdate((event) => {
          'worklet';
          runOnJS(updateFromPosition)(panStart.current + event.translationX);
        }),
    [normalized, trackWidth, updateFromPosition],
  );

  const handleTrackLayout = useCallback((event: { nativeEvent: { layout: { width: number } } }) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const handleTrackPress = useCallback(
    (event: GestureResponderEvent) => {
      updateFromPosition(event.nativeEvent.locationX);
    },
    [updateFromPosition],
  );

  const handleStep = useCallback(
    (direction: 1 | -1) => {
      applyValue(value + direction * buttonDelta);
    },
    [applyValue, value, buttonDelta],
  );
  const handleReset = useCallback(() => {
    onChange(defaultValue);
  }, [defaultValue, onChange]);

  const thumbLeft = Math.max(0, Math.min(Math.max(0, (trackWidth || 0) - THUMB_SIZE), thumbPosition - THUMB_RADIUS));

  return (
    <View style={{ width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{displayValue}</Text>
        </View>
        <Pressable
          onPress={handleReset}
          disabled={isAtDefault}
          style={({ pressed }) => [
            {
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: theme.background,
              opacity: isAtDefault ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{resetLabel}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <Pressable
          onPress={() => handleStep(-1)}
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.background,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name='minus' size={18} color={theme.text} />
        </Pressable>

        <GestureDetector gesture={panGesture}>
          <Pressable onPress={handleTrackPress} style={{ flex: 1, position: 'relative' }}>
            <View
              onLayout={handleTrackLayout}
              style={{
                height: TRACK_HEIGHT,
                borderRadius: TRACK_HEIGHT / 2,
                backgroundColor: theme.sliderMax ?? theme.border,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${fillPercent}%`,
                  height: '100%',
                  backgroundColor: theme.sliderMin ?? theme.primary,
                }}
              />
            </View>
            <View
              pointerEvents='none'
              style={{
                position: 'absolute',
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_RADIUS,
                backgroundColor: theme.sliderThumb ?? theme.primary,
                borderWidth: 2,
                borderColor: theme.surface,
                top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
                left: thumbLeft,
              }}
            />
          </Pressable>
        </GestureDetector>

        <Pressable
          onPress={() => handleStep(1)}
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.background,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name='plus' size={18} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
};

const LayersBottomSheet = ({
  visible,
  layers,
  selectedLayerId,
  onSelectLayer,
  onRemoveLayer,
  onUpdateLayerTransform,
  onClose,
  onAddLayer,
}: Props) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(400);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(400, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, translateY, opacity]);

  // Handle Android back button
  useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSheet();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [visible, closeSheet]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const closeSheet = useCallback(() => {
    translateY.value = withTiming(400, { duration: 250 });
    opacity.value = withTiming(0, { duration: 200 });
    // Call onClose after animation completes
    setTimeout(() => {
      onClose();
    }, 250);
  }, [translateY, opacity, onClose]);

  const panGesture = Gesture.Pan()
    .activeOffsetY(10) // Only activate when dragging down
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 150 || event.velocityY > 500) {
        translateY.value = withTiming(400, { duration: 250 });
        opacity.value = withTiming(0, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withTiming(0, { duration: 250 });
      }
    });

  const SCALE_MIN = 0.5;
  const SCALE_MAX = 2;
  const ROTATION_MIN = -180;
  const ROTATION_MAX = 180;

  const handleScaleChange = useCallback(
    (layerId: string, nextScale: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const clampedScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, nextScale));
      onUpdateLayerTransform(layerId, {
        scale: Number(clampedScale.toFixed(3)),
      });
    },
    [layers, onUpdateLayerTransform],
  );

  const handleRotationChange = useCallback(
    (layerId: string, nextRotation: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const wrapped = Math.max(ROTATION_MIN, Math.min(ROTATION_MAX, nextRotation));
      onUpdateLayerTransform(layerId, {
        rotation: Number(wrapped.toFixed(1)),
      });
    },
    [layers, onUpdateLayerTransform],
  );

  const handleOpacityChange = useCallback(
    (layerId: string, nextOpacity: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const clampedOpacity = Math.max(0, Math.min(1, nextOpacity));
      onUpdateLayerTransform(layerId, {
        opacity: Number(clampedOpacity.toFixed(2)),
      });
    },
    [layers, onUpdateLayerTransform],
  );

  if (!visible) return null;

  return (
    <>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeSheet} />
      </Animated.View>

      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '50%',
            paddingBottom: insets.bottom,
            zIndex: 1001,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
          },
          sheetStyle,
        ]}
      >
        {/* Handle - this area is for dragging */}
        <GestureDetector gesture={panGesture}>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, backgroundColor: theme.border, borderRadius: 2 }} />
          </View>
        </GestureDetector>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 }}>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: 'bold' }}>{t('layers')}</Text>
            <Pressable
              onPress={onAddLayer}
              style={({ pressed }) => [
                {
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <MaterialCommunityIcons name='plus' size={20} color='white' />
            </Pressable>
          </View>

          {/* Layers List */}
          <FlatList
            data={[...layers].reverse()}
            keyExtractor={(item) => item.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 16 }}
            nestedScrollEnabled={true}
            scrollEnabled={true}
            renderItem={({ item: layer }) => {
              const isSelected = selectedLayerId === layer.id;
              const opacityValue = typeof layer.transform.opacity === 'number' ? layer.transform.opacity : 1;
              const opacityPercent = Math.round(opacityValue * 100);
              return (
                <View
                  style={{
                    padding: 16,
                    marginHorizontal: 16,
                    marginBottom: 8,
                    borderRadius: 12,
                    backgroundColor: isSelected ? theme.primary + '20' : theme.background,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.primary : theme.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable
                      onPress={() => onSelectLayer(isSelected ? null : layer.id)}
                      style={({ pressed }) => [
                        {
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Image source={{ uri: layer.uri }} style={{ width: 50, height: 50, borderRadius: 8 }} resizeMode='cover' />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                          {t('layer')} {layers.length - layers.indexOf(layer)}
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                          {Math.round(layer.transform.rotation)}° • {Math.round(layer.transform.scale * 100)}% • {opacityPercent}% {t('opacity')}
                        </Text>
                      </View>
                    </Pressable>

                    {isSelected && (
                      <Pressable
                        onPress={() => onRemoveLayer(layer.id)}
                        style={({ pressed }) => [
                          {
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: '#FF3B30',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons name='delete' size={18} color='white' />
                      </Pressable>
                    )}
                  </View>

                  {isSelected && (
                    <View style={{ width: '100%', marginTop: 12, gap: 12 }}>
                      <LayerControlSlider
                        label={t('size')}
                        displayValue={`${Math.round(layer.transform.scale * 100)}%`}
                        value={layer.transform.scale}
                        min={SCALE_MIN}
                        max={SCALE_MAX}
                        step={0.01}
                        buttonStep={0.1}
                        defaultValue={1}
                        resetLabel={t('reset')}
                        onChange={(next) => handleScaleChange(layer.id, next)}
                        theme={theme}
                      />
                      <LayerControlSlider
                        label={t('angle')}
                        displayValue={`${Math.round(layer.transform.rotation)}°`}
                        value={layer.transform.rotation}
                        min={ROTATION_MIN}
                        max={ROTATION_MAX}
                        step={1}
                        buttonStep={15}
                        defaultValue={0}
                        resetLabel={t('reset')}
                        onChange={(next) => handleRotationChange(layer.id, next)}
                        theme={theme}
                      />
                      <LayerControlSlider
                        label={t('opacity')}
                        displayValue={`${opacityPercent}%`}
                        value={opacityValue}
                        min={0}
                        max={1}
                        step={0.01}
                        buttonStep={0.1}
                        defaultValue={1}
                        resetLabel={t('reset')}
                        onChange={(next) => handleOpacityChange(layer.id, next)}
                        theme={theme}
                      />
                    </View>
                  )}
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={{ padding: 40, alignItems: 'center' }}>
                <MaterialCommunityIcons name='image-off' size={48} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary, fontSize: 16, marginTop: 12 }}>{t('noLayers')}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 14, marginTop: 4, textAlign: 'center' }}>{t('addLayerHint')}</Text>
              </View>
            }
          />
        </Animated.View>
    </>
  );
};

export default LayersBottomSheet;
