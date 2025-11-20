import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Image, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';

export type OverlayTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type Props = {
  baseImageUri: string;
  overlayImageUri?: string | null;
  overlayTransform: OverlayTransform;
  onOverlayTransformChange: (transform: OverlayTransform) => void;
};

export type ImageCanvasHandle = {
  resetOverlay: () => void;
  capture: () => Promise<string | undefined>;
};

const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(
  ({ baseImageUri, overlayImageUri, overlayTransform, onOverlayTransformChange }: Props, ref) => {
    const overlayScale = useSharedValue(overlayTransform.scale);
    const overlayRotation = useSharedValue(overlayTransform.rotation);
    const overlayTranslateX = useSharedValue(overlayTransform.x);
    const overlayTranslateY = useSharedValue(overlayTransform.y);

    const cameraScale = useSharedValue(1);
    const cameraTranslateX = useSharedValue(0);
    const cameraTranslateY = useSharedValue(0);
    const panStartX = useSharedValue(0);
    const panStartY = useSharedValue(0);
    const containerWidth = useSharedValue(0);
    const containerHeight = useSharedValue(0);
    const baseBoundsShared = useSharedValue({ x: 0, y: 0, width: 0, height: 0 });
    const overlayPanStartX = useSharedValue(0);
    const overlayPanStartY = useSharedValue(0);
    const overlayContainerSize = useSharedValue({ width: 0, height: 0 });

    const [scalePercent, setScalePercent] = useState(100);
    const [isOverlayActive, setIsOverlayActive] = useState(false);
    const [baseImageSize, setBaseImageSize] = useState({ width: 0, height: 0 });
    const [overlayImageSize, setOverlayImageSize] = useState({ width: 0, height: 0 });
    const [baseBounds, setBaseBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const isAdjustingRef = useRef(false);
    const layoutRef = useRef({ width: 0, height: 0 });
    const captureViewShotRef = useRef<ViewShot | null>(null);

    const reportTransform = useCallback(
      (payload: OverlayTransform) => {
        onOverlayTransformChange(payload);
      },
      [onOverlayTransformChange],
    );

    useImperativeHandle(ref, () => ({
      resetOverlay: () => {
        overlayTranslateX.value = 0;
        overlayTranslateY.value = 0;
        overlayScale.value = 1;
        overlayRotation.value = 0;
        reportTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
      },
      capture: async () => {
        return await captureViewShotRef.current?.capture?.();
      },
    }));

    useEffect(() => {
      overlayTranslateX.value = overlayTransform.x;
    }, [overlayTransform.x, overlayTranslateX]);

    useEffect(() => {
      overlayTranslateY.value = overlayTransform.y;
    }, [overlayTransform.y, overlayTranslateY]);

    useEffect(() => {
      overlayScale.value = overlayTransform.scale;
    }, [overlayTransform.scale, overlayScale]);

    useEffect(() => {
      overlayRotation.value = overlayTransform.rotation;
    }, [overlayTransform.rotation, overlayRotation]);

    useEffect(() => {
      cameraScale.value = 1;
      cameraTranslateX.value = 0;
      cameraTranslateY.value = 0;
      setScalePercent(100);
    }, [baseImageUri, cameraScale, cameraTranslateX, cameraTranslateY]);

    useEffect(() => {
      if (!baseImageUri) {
        setBaseImageSize({ width: 0, height: 0 });
        return;
      }
      Image.getSize(
        baseImageUri,
        (width, height) => {
          setBaseImageSize({ width, height });
        },
        () => {
          setBaseImageSize({ width: 0, height: 0 });
        },
      );
    }, [baseImageUri]);

    useEffect(() => {
      if (!overlayImageUri) {
        setOverlayImageSize({ width: 0, height: 0 });
        setIsOverlayActive(false);
        return;
      }
      Image.getSize(
        overlayImageUri,
        (width, height) => {
          setOverlayImageSize({ width, height });
        },
        () => {
          setOverlayImageSize({ width: 0, height: 0 });
        },
      );
    }, [overlayImageUri]);

    useEffect(() => {
      const { width: containerWidthValue, height: containerHeightValue } = containerSize;
      if (!containerWidthValue || !containerHeightValue || !baseImageSize.width || !baseImageSize.height) {
        return;
      }
      const containerRatio = containerWidthValue / containerHeightValue;
      const imageRatio = baseImageSize.width / baseImageSize.height;

      let width = containerWidthValue;
      let height = containerHeightValue;
      if (imageRatio > containerRatio) {
        width = containerWidthValue;
        height = width / imageRatio;
      } else {
        height = containerHeightValue;
        width = height * imageRatio;
      }
      const x = (containerWidthValue - width) / 2;
      const y = (containerHeightValue - height) / 2;
      const bounds = { x, y, width, height };
      setBaseBounds(bounds);
      baseBoundsShared.value = bounds;
    }, [baseImageSize, containerSize, baseBoundsShared]);

    const overlayDisplaySize = useMemo(() => {
      if (!overlayImageUri || !baseBounds.width || !baseBounds.height) {
        return { width: 0, height: 0 };
      }
      const aspect = overlayImageSize.width && overlayImageSize.height ? overlayImageSize.width / overlayImageSize.height : 1;
      const maxWidth = baseBounds.width * 0.6;
      const maxHeight = baseBounds.height * 0.6;
      let width = maxWidth;
      let height = width / aspect;
      if (height > maxHeight) {
        height = maxHeight;
        width = height * aspect;
      }
      return { width, height };
    }, [overlayImageUri, overlayImageSize, baseBounds]);

    useEffect(() => {
      overlayContainerSize.value = overlayDisplaySize;
    }, [overlayDisplaySize, overlayContainerSize]);

    useEffect(() => {
      const nextScale = scalePercent / 100;
      cameraScale.value = nextScale;
      const { width, height } = layoutRef.current;
      const clamp = (value: number, dimension: number) => {
        if (nextScale <= 1) return 0;
        const maxOffset = ((nextScale - 1) * dimension) / 2;
        return Math.max(-maxOffset, Math.min(maxOffset, value));
      };
      cameraTranslateX.value = clamp(cameraTranslateX.value, width);
      cameraTranslateY.value = clamp(cameraTranslateY.value, height);
      if (nextScale <= 1) {
        cameraTranslateX.value = 0;
        cameraTranslateY.value = 0;
      }
    }, [scalePercent, cameraScale, cameraTranslateX, cameraTranslateY]);


    const handleBaseImageLayout = useCallback(() => {
      // no-op; kept for compatibility
    }, []);

    const overlayTap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((_event, success) => {
        if (success) {
          runOnJS(setIsOverlayActive)(true);
        }
      });

    const overlayPan = Gesture.Pan()
      .onStart(() => {
        overlayPanStartX.value = overlayTranslateX.value;
        overlayPanStartY.value = overlayTranslateY.value;
        runOnJS(setIsOverlayActive)(true);
      })
      .onUpdate((event) => {
        const bounds = baseBoundsShared.value;
        const overlaySize = overlayContainerSize.value;
        const currentScale = overlayScale.value;

        const overlayWidth = overlaySize.width * currentScale;
        const overlayHeight = overlaySize.height * currentScale;

        let newX = overlayPanStartX.value + event.translationX;
        let newY = overlayPanStartY.value + event.translationY;

        // Координаты относительно ViewShot (который начинается с 0,0 внутри baseBounds)
        const halfWidth = overlayWidth / 2;
        const halfHeight = overlayHeight / 2;
        const baseCenterX = bounds.width / 2;
        const baseCenterY = bounds.height / 2;

        const minX = halfWidth - baseCenterX;
        const maxX = bounds.width - halfWidth - baseCenterX;
        const minY = halfHeight - baseCenterY;
        const maxY = bounds.height - halfHeight - baseCenterY;

        if (minX <= maxX) {
          newX = Math.max(minX, Math.min(maxX, newX));
        } else {
          newX = ((minX + maxX) / 2) || 0;
        }

        if (minY <= maxY) {
          newY = Math.max(minY, Math.min(maxY, newY));
        } else {
          newY = ((minY + maxY) / 2) || 0;
        }

        overlayTranslateX.value = newX;
        overlayTranslateY.value = newY;
      })
      .onEnd(() => {
        'worklet';
        runOnJS(reportTransform)({
          x: overlayTranslateX.value,
          y: overlayTranslateY.value,
          scale: overlayScale.value,
          rotation: overlayRotation.value,
        });
      });

    const backgroundTap = Gesture.Tap()
      .maxDistance(10)
      .onEnd((_event, success) => {
        if (success) {
          runOnJS(setIsOverlayActive)(false);
        }
      })
      .requireExternalGestureToFail(overlayPan)
      .requireExternalGestureToFail(overlayTap);

    const cameraPan = Gesture.Pan()
      .onStart(() => {
        panStartX.value = cameraTranslateX.value;
        panStartY.value = cameraTranslateY.value;
      })
      .onUpdate((event) => {
        if (cameraScale.value <= 1) {
          return;
        }
        const maxX = ((cameraScale.value - 1) * containerWidth.value) / 2;
        const maxY = ((cameraScale.value - 1) * containerHeight.value) / 2;
        const nextX = panStartX.value + event.translationX;
        const nextY = panStartY.value + event.translationY;
        cameraTranslateX.value = Math.max(-maxX, Math.min(maxX, nextX));
        cameraTranslateY.value = Math.max(-maxY, Math.min(maxY, nextY));
      });

    const cameraStyle = useAnimatedStyle(() => ({
      transform: [{ scale: cameraScale.value }, { translateX: cameraTranslateX.value }, { translateY: cameraTranslateY.value }],
    }));

    const handleLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        layoutRef.current = { width, height };
        containerWidth.value = width;
        containerHeight.value = height;
        setContainerSize({ width, height });
      },
      [containerHeight, containerWidth],
    );

    const adjustScale = (delta: number) => {
      if (isAdjustingRef.current) return;
      isAdjustingRef.current = true;
      setScalePercent((prev) => Math.max(50, Math.min(300, prev + delta)));
      setTimeout(() => {
        isAdjustingRef.current = false;
      }, 40);
    };

    const overlayAnimatedStyle = useAnimatedStyle(() => {
      const bounds = baseBoundsShared.value;
      const overlaySize = overlayContainerSize.value;
      const currentScale = overlayScale.value;
      const width = overlaySize.width * currentScale;
      const height = overlaySize.height * currentScale;
      // Координаты относительно ViewShot (который начинается с baseBounds.x, baseBounds.y)
      const left = bounds.width / 2 - width / 2 + overlayTranslateX.value;
      const top = bounds.height / 2 - height / 2 + overlayTranslateY.value;

      return {
        position: 'absolute',
        left,
        top,
        width,
        height,
        transform: [{ rotate: `${overlayRotation.value}deg` }],
      };
    });

    const containerGesture = Gesture.Simultaneous(cameraPan, backgroundTap);
    const overlayGesture = Gesture.Simultaneous(overlayPan, overlayTap);

    const overlayMaxBoundsReady = baseBounds.width > 0 && baseBounds.height > 0 && overlayDisplaySize.width > 0 && overlayDisplaySize.height > 0;

    return (
      <View style={{ width: '100%', height: '100%', position: 'relative' }} onLayout={handleLayout}>
        <GestureDetector gesture={containerGesture}>
          <Animated.View style={[{ width: '100%', height: '100%' }, cameraStyle]}>
            <ViewShot
              ref={captureViewShotRef}
              options={{
                format: 'png',
                quality: 1,
                width: baseBounds.width > 0 ? Math.round(baseBounds.width) : undefined,
                height: baseBounds.height > 0 ? Math.round(baseBounds.height) : undefined,
              }}
              collapsable={false}
              style={{
                position: 'absolute',
                left: baseBounds.x,
                top: baseBounds.y,
                width: baseBounds.width > 0 ? baseBounds.width : '100%',
                height: baseBounds.height > 0 ? baseBounds.height : '100%',
                overflow: 'hidden',
              }}
            >
              <View style={{ width: '100%', height: '100%' }} onLayout={handleBaseImageLayout}>
                <Image source={{ uri: baseImageUri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
              </View>

              {overlayImageUri && overlayMaxBoundsReady && (
                <GestureDetector gesture={overlayGesture}>
                  <Animated.View style={[overlayAnimatedStyle]}>
                    <Image source={{ uri: overlayImageUri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
                    {isOverlayActive && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          borderWidth: 2,
                          borderColor: '#007AFF',
                          borderRadius: 4,
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </Animated.View>
                </GestureDetector>
              )}
            </ViewShot>
          </Animated.View>
        </GestureDetector>

          <View
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
              onPress={() => adjustScale(-10)}
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
              onPress={() => adjustScale(10)}
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
  },
);
ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;

