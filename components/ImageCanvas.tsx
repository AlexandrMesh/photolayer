import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

import { Pressable, Text, View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useTheme } from '../contexts/ThemeContext';

type Props = {
  imageUri: string;
  angle: number;
  onScalePercentChange?: (pct: number) => void;
  onPickAnother?: () => void;
};

const AnimatedImage = Animated.createAnimatedComponent(Image);

export type ImageCanvasHandle = {
  resetTransform: () => void;
};

const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ imageUri, angle, onScalePercentChange, onPickAnother }: Props, ref) => {
  const [scalePercent, setScalePercent] = useState<number>(100);
  const isAdjustingRef = useRef<boolean>(false);
  const { theme: _theme } = useTheme();
  const startScale = useSharedValue(1);
  const pinchScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    resetTransform: () => {
      pinchScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      // reflect in UI
      setScalePercent(100);
      if (onScalePercentChange) onScalePercentChange(100);
    },
  }));

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = pinchScale.value;
    })
    .onUpdate((e) => {
      'worklet';
      const next = startScale.value * e.scale;
      pinchScale.value = Math.min(3, Math.max(0.5, next));
    })
    .onEnd(() => {
      'worklet';
      const pct = Math.round(pinchScale.value * 100);
      runOnJS(setScalePercent)(pct);
      if (onScalePercentChange) {
        runOnJS(onScalePercentChange)(pct);
      }
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      if (pinchScale.value > 1.01) {
        pinchScale.value = 1;
        translateX.value = 0;
        translateY.value = 0;
      } else {
        pinchScale.value = 2;
      }
      const pct = Math.round(pinchScale.value * 100);
      runOnJS(setScalePercent)(pct);
      if (onScalePercentChange) {
        runOnJS(onScalePercentChange)(pct);
      }
    });

  const gestures = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: pinchScale.value }, { rotate: `${angle}deg` }],
  }));

  return (
    <View style={{ width: '100%', height: '100%', position: 'relative' }}>
      <GestureDetector gesture={gestures}>
        <Animated.View style={{ width: '100%', height: '100%' }}>
          <AnimatedImage
            source={{ uri: imageUri }}
            style={[{ width: '100%', height: '100%' }, animatedStyle]}
            contentFit='contain'
            transition={200}
          />
        </Animated.View>
      </GestureDetector>
      {!!onPickAnother && (
        <Pressable
          onPress={onPickAnother}
          accessibilityLabel='Выбрать другое изображение'
          style={({ pressed }) => [
            {
              position: 'absolute',
              top: 10,
              right: 10,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <MaterialIcons name='folder-open' size={20} color='#E5E7EB' />
        </Pressable>
      )}
      <View
        // Keep HUD outside GestureDetector to avoid double-tap conflicts when pressing buttons
        style={{
          position: 'absolute',
          right: 10,
          bottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(0,0,0,0.35)',
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 12,
        }}
      >
        <Pressable
          onPress={() => {
            if (isAdjustingRef.current) return;
            isAdjustingRef.current = true;
            setScalePercent((prev) => {
              const nextPct = Math.max(50, Math.min(300, prev - 10));
              pinchScale.value = nextPct / 100;
              if (onScalePercentChange) onScalePercentChange(nextPct);
              return nextPct;
            });
            setTimeout(() => {
              isAdjustingRef.current = false;
            }, 40);
          }}
          style={({ pressed }) => [
            {
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.95 : 1 }],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: 'rgba(229,231,235,0.9)', fontSize: 18 }}>−</Text>
        </Pressable>
        <Text style={{ color: 'rgba(229,231,235,0.8)', fontSize: 14, minWidth: 48, textAlign: 'center' }}>{scalePercent}%</Text>
        <Pressable
          onPress={() => {
            if (isAdjustingRef.current) return;
            isAdjustingRef.current = true;
            setScalePercent((prev) => {
              const nextPct = Math.max(50, Math.min(300, prev + 10));
              pinchScale.value = nextPct / 100;
              if (onScalePercentChange) onScalePercentChange(nextPct);
              return nextPct;
            });
            setTimeout(() => {
              isAdjustingRef.current = false;
            }, 40);
          }}
          style={({ pressed }) => [
            {
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: pressed ? 0.95 : 1 }],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={{ color: 'rgba(229,231,235,0.9)', fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
});
ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;
export type { Props as ImageCanvasProps };
