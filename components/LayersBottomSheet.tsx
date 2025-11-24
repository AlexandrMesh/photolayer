import { useCallback, useEffect } from 'react';

import { BackHandler, FlatList, Image, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';

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

  const handleRotate = useCallback(
    (layerId: string, delta: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        onUpdateLayerTransform(layerId, {
          rotation: layer.transform.rotation + delta,
        });
      }
    },
    [layers, onUpdateLayerTransform],
  );

  const handleScale = useCallback(
    (layerId: string, delta: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (layer) {
        onUpdateLayerTransform(layerId, {
          scale: Math.max(0.5, Math.min(2, layer.transform.scale + delta)),
        });
      }
    },
    [layers, onUpdateLayerTransform],
  );

  const handleOpacityAdjust = useCallback(
    (layerId: string, delta: number) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      const currentOpacity = typeof layer.transform.opacity === 'number' ? layer.transform.opacity : 1;
      const nextOpacity = Math.max(0, Math.min(1, currentOpacity + delta));
      onUpdateLayerTransform(layerId, {
        opacity: Number(nextOpacity.toFixed(2)),
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
                <Pressable
                  onPress={() => onSelectLayer(isSelected ? null : layer.id)}
                  style={({ pressed }) => [
                    {
                      padding: 16,
                      marginHorizontal: 16,
                      marginBottom: 8,
                      borderRadius: 12,
                      backgroundColor: isSelected ? theme.primary + '20' : theme.background,
                      borderWidth: isSelected ? 2 : 1,
                      borderColor: isSelected ? theme.primary : theme.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image source={{ uri: layer.uri }} style={{ width: 50, height: 50, borderRadius: 8 }} resizeMode='cover' />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
                        {t('layer')} {layers.length - layers.indexOf(layer)}
                      </Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {Math.round(layer.transform.rotation)}° • {Math.round(layer.transform.scale * 100)}% • {opacityPercent}% {t('opacity')}
                      </Text>
                    </View>

                    {isSelected && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => handleScale(layer.id, -0.1)}
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
                        <Pressable
                          onPress={() => handleScale(layer.id, 0.1)}
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
                        <Pressable
                          onPress={() => handleRotate(layer.id, -15)}
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
                          <MaterialCommunityIcons name='rotate-left' size={18} color={theme.text} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleRotate(layer.id, 15)}
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
                          <MaterialCommunityIcons name='rotate-right' size={18} color={theme.text} />
                        </Pressable>
                        <Pressable
                          onPress={() => onRemoveLayer(layer.id)}
                          style={({ pressed }) => [
                            {
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: '#FF3B30',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: pressed ? 0.7 : 1,
                            },
                          ]}
                        >
                          <MaterialCommunityIcons name='delete' size={18} color='white' />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {isSelected && (
                    <View style={{ width: '100%', marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>{t('opacity')}</Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{opacityPercent}%</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <Pressable
                          onPress={() => handleOpacityAdjust(layer.id, -0.1)}
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
                        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: theme.border, overflow: 'hidden' }}>
                          <View style={{ width: `${opacityPercent}%`, height: '100%', borderRadius: 3, backgroundColor: theme.primary }} />
                        </View>
                        <Pressable
                          onPress={() => handleOpacityAdjust(layer.id, 0.1)}
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
                  )}
                </Pressable>
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
