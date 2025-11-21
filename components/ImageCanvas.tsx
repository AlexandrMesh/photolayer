import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { Image, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';

import type { SharedValue } from 'react-native-reanimated';

export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type Layer = {
  id: string;
  uri: string;
  transform: LayerTransform;
};

type LayerSize = { width: number; height: number };
type Bounds = { x: number; y: number; width: number; height: number };

type Props = {
  baseImageUri: string;
  layers: Layer[];
  onLayersChange: (layers: Layer[]) => void;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string | null) => void;
};

export type ImageCanvasHandle = {
  capture: () => Promise<string | undefined>;
};

type LayerDisplayProps = {
  layer: Layer;
  layerSize?: LayerSize;
  selected: boolean;
  baseDisplayBounds: SharedValue<Bounds>;
  baseScale: SharedValue<number>;
  gesture?: ReturnType<typeof Gesture.Simultaneous>;
};

const LayerDisplay = ({ layer, layerSize, selected, baseDisplayBounds, baseScale, gesture }: LayerDisplayProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (!layerSize?.width || !layerSize?.height) {
      return { position: 'absolute', width: 0, height: 0, opacity: 0 };
    }

    const bounds = baseDisplayBounds.value;
    const baseScaleValue = baseScale.value;

    // Base center in container (remains constant at bounds.x + bounds.width/2)
    // This is the center point around which scaling happens
    const baseCenterX = bounds.x + bounds.width / 2;
    const baseCenterY = bounds.y + bounds.height / 2;

    // Calculate layer size at scale 1 first, then scale with baseScaleValue
    const maxWidthAtScale1 = bounds.width * 0.6;
    const maxHeightAtScale1 = bounds.height * 0.6;
    const aspect = layerSize.width / layerSize.height;
    let layerWidthAtScale1 = maxWidthAtScale1;
    let layerHeightAtScale1 = layerWidthAtScale1 / aspect;
    if (layerHeightAtScale1 > maxHeightAtScale1) {
      layerHeightAtScale1 = maxHeightAtScale1;
      layerWidthAtScale1 = layerHeightAtScale1 * aspect;
    }

    // Scale layer size with base scale
    const scaledWidth = layerWidthAtScale1 * layer.transform.scale * baseScaleValue;
    const scaledHeight = layerHeightAtScale1 * layer.transform.scale * baseScaleValue;

    // Layer position: stored at scale 1, so we scale it with baseScaleValue
    // Position is relative to base center, scaled proportionally with base image
    const left = baseCenterX - scaledWidth / 2 + layer.transform.x * baseScaleValue;
    const top = baseCenterY - scaledHeight / 2 + layer.transform.y * baseScaleValue;

    return {
      position: 'absolute',
      left,
      top,
      width: scaledWidth,
      height: scaledHeight,
      transform: [{ rotate: `${layer.transform.rotation}deg` }],
    };
  }, [layer, layerSize]);

  return (
    <Animated.View style={[animatedStyle]} collapsable={false} pointerEvents='box-none'>
      {gesture ? (
        <GestureDetector gesture={gesture}>
          <View style={{ width: '100%', height: '100%' }} collapsable={false}>
            <Image source={{ uri: layer.uri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
            {selected && (
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
          </View>
        </GestureDetector>
      ) : (
        <View style={{ width: '100%', height: '100%' }} collapsable={false}>
          <Image source={{ uri: layer.uri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
          {selected && (
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
        </View>
      )}
    </Animated.View>
  );
};

type LayerCaptureProps = {
  layer: Layer;
  layerSize?: LayerSize;
  baseImageSizeShared: SharedValue<LayerSize>;
  baseDisplayBounds: SharedValue<Bounds>;
};

const LayerCapture = ({ layer, layerSize, baseImageSizeShared, baseDisplayBounds }: LayerCaptureProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    const bounds = baseDisplayBounds.value;
    const baseSize = baseImageSizeShared.value;
    if (!bounds.width || !bounds.height || !baseSize.width || !baseSize.height) {
      return { position: 'absolute', width: 0, height: 0, opacity: 0 };
    }

    if (!layerSize?.width || !layerSize?.height) {
      return { position: 'absolute', width: 0, height: 0, opacity: 0 };
    }

    const scaleX = baseSize.width / bounds.width;
    const scaleY = baseSize.height / bounds.height;

    const maxWidth = bounds.width * 0.6;
    const maxHeight = bounds.height * 0.6;
    const aspect = layerSize.width / layerSize.height;
    let layerWidth = maxWidth;
    let layerHeight = layerWidth / aspect;
    if (layerHeight > maxHeight) {
      layerHeight = maxHeight;
      layerWidth = layerHeight * aspect;
    }

    const scaledWidth = layerWidth * layer.transform.scale * scaleX;
    const scaledHeight = layerHeight * layer.transform.scale * scaleY;

    const baseCenterX = baseSize.width / 2;
    const baseCenterY = baseSize.height / 2;

    const left = baseCenterX - scaledWidth / 2 + layer.transform.x * scaleX;
    const top = baseCenterY - scaledHeight / 2 + layer.transform.y * scaleY;

    return {
      position: 'absolute',
      left,
      top,
      width: scaledWidth,
      height: scaledHeight,
      transform: [{ rotate: `${layer.transform.rotation}deg` }],
    };
  }, [layer, layerSize]);

  return (
    <Animated.View style={[animatedStyle]}>
      <Image source={{ uri: layer.uri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
    </Animated.View>
  );
};

const ImageCanvas = forwardRef<ImageCanvasHandle, Props>(({ baseImageUri, layers, onLayersChange, selectedLayerId, onSelectLayer }: Props, ref) => {
  // Base image transforms
  const baseScale = useSharedValue(1);
  const baseTranslateX = useSharedValue(0);
  const baseTranslateY = useSharedValue(0);
  const basePanStartX = useSharedValue(0);
  const basePanStartY = useSharedValue(0);
  const basePinchStartScale = useSharedValue(1);

  // Container dimensions
  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const baseImageSizeShared = useSharedValue({ width: 0, height: 0 });
  const baseDisplayBounds = useSharedValue({ x: 0, y: 0, width: 0, height: 0 });

  // Layer pan start positions
  const layerPanStart = useRef<Record<string, { x: number; y: number }>>({});

  // State
  const [baseImageSize, setBaseImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [layerSizes, setLayerSizes] = useState<Record<string, LayerSize>>({});
  const [scalePercent, setScalePercent] = useState(100);
  const isAdjustingRef = useRef(false);
  const captureViewShotRef = useRef<ViewShot | null>(null);

  // Get base image size
  useEffect(() => {
    if (!baseImageUri) {
      setBaseImageSize({ width: 0, height: 0 });
      baseImageSizeShared.value = { width: 0, height: 0 };
      return;
    }
    Image.getSize(
      baseImageUri,
      (width, height) => {
        const size = { width, height };
        setBaseImageSize(size);
        baseImageSizeShared.value = size;
      },
      () => {
        setBaseImageSize({ width: 0, height: 0 });
        baseImageSizeShared.value = { width: 0, height: 0 };
      },
    );
  }, [baseImageUri, baseImageSizeShared]);

  // Get layer sizes - load sizes for all layers that don't have sizes yet
  useEffect(() => {
    const layerIds = new Set(layers.map((l) => l.id));
    const loadedIds = new Set(Object.keys(layerSizes));
    const layersToLoad = layers.filter((layer) => !loadedIds.has(layer.id));

    layersToLoad.forEach((layer) => {
      // Load image size
      Image.getSize(
        layer.uri,
        (width, height) => {
          setLayerSizes((prev) => {
            // Double check to avoid race conditions
            if (prev[layer.id]) return prev;
            return {
              ...prev,
              [layer.id]: { width, height },
            };
          });
        },
        (error) => {
          console.warn('Failed to load layer size:', layer.uri, error);
          setLayerSizes((prev) => {
            if (prev[layer.id]) return prev;
            return {
              ...prev,
              [layer.id]: { width: 0, height: 0 },
            };
          });
        },
      );
    });

    // Clean up sizes for removed layers
    const idsToRemove = Array.from(loadedIds).filter((id) => !layerIds.has(id));
    if (idsToRemove.length > 0) {
      setLayerSizes((prev) => {
        const next = { ...prev };
        idsToRemove.forEach((id) => delete next[id]);
        return next;
      });
    }
  }, [layers, layerSizes]);

  // Calculate base image display bounds (contain mode)
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
    baseDisplayBounds.value = bounds;
  }, [baseImageSize, containerSize, baseDisplayBounds]);

  // Reset base transform when base image changes
  useEffect(() => {
    baseScale.value = 1;
    baseTranslateX.value = 0;
    baseTranslateY.value = 0;
    setScalePercent(100);
  }, [baseImageUri, baseScale, baseTranslateX, baseTranslateY]);

  // Sync scale percent with baseScale when pinch gesture ends
  // Note: We'll update scalePercent in adjustScale and basePinch.onEnd

  // Adjust scale with buttons
  const adjustScale = useCallback(
    (delta: number) => {
      if (isAdjustingRef.current) return;
      isAdjustingRef.current = true;
      const newPercent = Math.max(50, Math.min(300, scalePercent + delta));
      setScalePercent(newPercent);
      const newScale = newPercent / 100;
      baseScale.value = newScale;

      // Constrain translation when scaling
      const bounds = baseDisplayBounds.value;
      const scaledWidth = bounds.width * newScale;
      const scaledHeight = bounds.height * newScale;

      if (newScale <= 1) {
        baseTranslateX.value = 0;
        baseTranslateY.value = 0;
      } else {
        const maxTranslateX = (scaledWidth - bounds.width) / 2;
        const maxTranslateY = (scaledHeight - bounds.height) / 2;
        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, baseTranslateX.value));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.value));
      }

      setTimeout(() => {
        isAdjustingRef.current = false;
      }, 50);
    },
    [scalePercent, baseScale, baseTranslateX, baseTranslateY, baseDisplayBounds],
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      containerWidth.value = width;
      containerHeight.value = height;
      setContainerSize({ width, height });
    },
    [containerHeight, containerWidth],
  );

  // Base image pan gesture - constrained to canvas bounds
  const basePan = Gesture.Pan()
    .onStart(() => {
      basePanStartX.value = baseTranslateX.value;
      basePanStartY.value = baseTranslateY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const scale = baseScale.value;
      if (scale <= 1) {
        baseTranslateX.value = 0;
        baseTranslateY.value = 0;
        return;
      }

      const bounds = baseDisplayBounds.value;
      const scaledWidth = bounds.width * scale;
      const scaledHeight = bounds.height * scale;

      // Calculate max translation to keep image within canvas
      const maxTranslateX = (scaledWidth - bounds.width) / 2;
      const maxTranslateY = (scaledHeight - bounds.height) / 2;

      const nextX = basePanStartX.value + event.translationX;
      const nextY = basePanStartY.value + event.translationY;

      baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, nextX));
      baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, nextY));
    })
    .withTestId('basePan');

  // Base image pinch gesture
  const basePinch = Gesture.Pinch()
    .onStart(() => {
      basePinchStartScale.value = baseScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = Math.max(1, Math.min(3, basePinchStartScale.value * event.scale));
      baseScale.value = newScale;

      // Constrain translation when scaling
      const bounds = baseDisplayBounds.value;
      const scaledWidth = bounds.width * newScale;
      const scaledHeight = bounds.height * newScale;

      if (newScale <= 1) {
        baseTranslateX.value = 0;
        baseTranslateY.value = 0;
      } else {
        const maxTranslateX = (scaledWidth - bounds.width) / 2;
        const maxTranslateY = (scaledHeight - bounds.height) / 2;
        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, baseTranslateX.value));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.value));
      }
    })
    .onEnd(() => {
      'worklet';
      runOnJS(setScalePercent)(Math.round(baseScale.value * 100));
    });

  // Base image tap to deselect layers - only if not tapping on a layer
  const baseTap = Gesture.Tap()
    .maxDistance(10)
    .onEnd(() => {
      'worklet';
      // Only deselect if no layer gesture is active
      runOnJS(onSelectLayer)(null);
    });

  // Base gesture should not interfere with layer gestures
  const baseGesture = Gesture.Simultaneous(basePan, basePinch, baseTap);

  // Base image animated style
  const baseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: baseScale.value }, { translateX: baseTranslateX.value }, { translateY: baseTranslateY.value }],
    };
  });

  // Update layer position with constraints
  const updateLayerPosition = useCallback(
    (
      layerId: string,
      newX: number,
      newY: number,
      baseScaleValue: number,
      baseBounds: { actualBaseX: number; actualBaseY: number; actualBaseWidth: number; actualBaseHeight: number },
    ) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const layerSize = layerSizes[layerId];
      if (!layerSize?.width || !layerSize?.height) return;

      // Calculate layer display size (fit within 60% of base)
      const maxWidth = baseBounds.actualBaseWidth * 0.6;
      const maxHeight = baseBounds.actualBaseHeight * 0.6;
      const aspect = layerSize.width / layerSize.height;
      let layerWidth = maxWidth;
      let layerHeight = layerWidth / aspect;
      if (layerHeight > maxHeight) {
        layerHeight = maxHeight;
        layerWidth = layerHeight * aspect;
      }

      const scaledLayerWidth = layerWidth * layer.transform.scale;
      const scaledLayerHeight = layerHeight * layer.transform.scale;

      // Base center in container coordinates
      const baseCenterX = baseBounds.actualBaseX + baseBounds.actualBaseWidth / 2;
      const baseCenterY = baseBounds.actualBaseY + baseBounds.actualBaseHeight / 2;

      // Calculate min/max positions for layer center
      const halfWidth = scaledLayerWidth / 2;
      const halfHeight = scaledLayerHeight / 2;
      const minX = baseBounds.actualBaseX + halfWidth;
      const maxX = baseBounds.actualBaseX + baseBounds.actualBaseWidth - halfWidth;
      const minY = baseBounds.actualBaseY + halfHeight;
      const maxY = baseBounds.actualBaseY + baseBounds.actualBaseHeight - halfHeight;

      // Current layer center position in screen coordinates
      const currentLayerCenterX = baseCenterX + newX;
      const currentLayerCenterY = baseCenterY + newY;

      // Constrain to base bounds
      const constrainedCenterX = Math.max(minX, Math.min(maxX, currentLayerCenterX));
      const constrainedCenterY = Math.max(minY, Math.min(maxY, currentLayerCenterY));

      // Layer position relative to base center in screen coordinates
      const constrainedXScreen = constrainedCenterX - baseCenterX;
      const constrainedYScreen = constrainedCenterY - baseCenterY;

      // Convert to scale-1 coordinates for storage
      // This ensures positions are stored at base scale 1, and will be scaled on display
      const constrainedX = constrainedXScreen / baseScaleValue;
      const constrainedY = constrainedYScreen / baseScaleValue;

      onLayersChange(layers.map((l) => (l.id === layerId ? { ...l, transform: { ...l.transform, x: constrainedX, y: constrainedY } } : l)));
    },
    [layers, layerSizes, onLayersChange],
  );

  // Create layer tap gesture for selection
  const createLayerTap = useCallback(
    (layer: Layer) => {
      return Gesture.Tap()
        .maxDistance(10)
        .onEnd(() => {
          runOnJS(onSelectLayer)(layer.id);
        });
    },
    [onSelectLayer],
  );

  // Create layer pan gesture
  const createLayerPan = useCallback(
    (layer: Layer) => {
      const layerPanGesture = Gesture.Pan()
        .minDistance(1)
        .onStart(() => {
          'worklet';
          // Store position in screen coordinates (scale-1 coordinates * current scale)
          const baseScaleValue = baseScale.value;
          layerPanStart.current[layer.id] = {
            x: layer.transform.x * baseScaleValue,
            y: layer.transform.y * baseScaleValue,
          };
          runOnJS(onSelectLayer)(layer.id);
        })
        .onUpdate((event) => {
          'worklet';
          const bounds = baseDisplayBounds.value;
          const baseScaleValue = baseScale.value;
          const baseTranslateXValue = baseTranslateX.value;
          const baseTranslateYValue = baseTranslateY.value;

          // Calculate actual base image bounds considering scale and translation
          const actualBaseX = bounds.x + baseTranslateXValue;
          const actualBaseY = bounds.y + baseTranslateYValue;
          const actualBaseWidth = bounds.width * baseScaleValue;
          const actualBaseHeight = bounds.height * baseScaleValue;

          // Get layer size - need to access from closure
          // We'll calculate constraints and pass to JS
          const panStart = layerPanStart.current[layer.id];
          if (!panStart) return;

          // Calculate new position in screen coordinates
          const newX = panStart.x + event.translationX;
          const newY = panStart.y + event.translationY;

          // Calculate constraints in JS callback
          // Pass baseScaleValue to convert screen coordinates to scale-1 coordinates
          runOnJS(updateLayerPosition)(layer.id, newX, newY, baseScaleValue, {
            actualBaseX,
            actualBaseY,
            actualBaseWidth,
            actualBaseHeight,
          });
        })
        .onEnd(() => {
          'worklet';
          // Clean up pan start
          delete layerPanStart.current[layer.id];
        });

      // Make layer gesture have priority over base gestures
      return layerPanGesture;
    },
    [baseScale, baseTranslateX, baseTranslateY, baseDisplayBounds, onSelectLayer, updateLayerPosition],
  );

  useImperativeHandle(ref, () => ({
    capture: async () => {
      return await captureViewShotRef.current?.capture?.();
    },
  }));

  return (
    <View style={{ width: '100%', height: '100%', position: 'relative' }} onLayout={handleLayout}>
      <GestureDetector gesture={baseGesture}>
        <Animated.View style={[{ width: '100%', height: '100%' }, baseAnimatedStyle]}>
          <Image source={{ uri: baseImageUri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
        </Animated.View>
      </GestureDetector>

      {/* Layers outside base gesture to avoid conflicts */}
      {layers.map((layer) => {
        const layerSize = layerSizes[layer.id];
        const isSelected = selectedLayerId === layer.id;
        const layerPan = createLayerPan(layer);

        // Only render layer if size is loaded
        if (!layerSize?.width || !layerSize?.height) {
          return null;
        }

        const layerTap = createLayerTap(layer);
        const layerGesture = Gesture.Simultaneous(layerTap, layerPan);

        return (
          <LayerDisplay
            key={layer.id}
            layer={layer}
            layerSize={layerSize}
            selected={isSelected}
            baseDisplayBounds={baseDisplayBounds}
            baseScale={baseScale}
            gesture={layerGesture}
          />
        );
      })}

      {/* Hidden ViewShot for capture */}
      {baseImageSize.width > 0 && baseImageSize.height > 0 && (
        <View
          style={{
            position: 'absolute',
            left: -100000,
            top: -100000,
            opacity: 0,
            pointerEvents: 'none',
            width: baseImageSize.width,
            height: baseImageSize.height,
          }}
        >
          <ViewShot
            ref={captureViewShotRef}
            options={{
              format: 'png',
              quality: 1,
              result: 'tmpfile',
              width: Math.round(baseImageSize.width),
              height: Math.round(baseImageSize.height),
            }}
            style={{ width: baseImageSize.width, height: baseImageSize.height }}
          >
            <View style={{ width: baseImageSize.width, height: baseImageSize.height }}>
              <Image source={{ uri: baseImageUri }} style={{ width: baseImageSize.width, height: baseImageSize.height }} resizeMode='contain' />
              {layers.map((layer) => {
                const layerSize = layerSizes[layer.id];
                return (
                  <LayerCapture
                    key={layer.id}
                    layer={layer}
                    layerSize={layerSize}
                    baseImageSizeShared={baseImageSizeShared}
                    baseDisplayBounds={baseDisplayBounds}
                  />
                );
              })}
            </View>
          </ViewShot>
        </View>
      )}

      {/* Scale controls */}
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
});
ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;
