import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Image, Pressable, Text, View, type ImageStyle, type LayoutChangeEvent } from 'react-native';

import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ViewShot from 'react-native-view-shot';

import type { SharedValue } from 'react-native-reanimated';

export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
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

type LayerOverflowIndicatorProps = {
  layer: Layer;
  layerSize?: LayerSize;
  baseDisplayBounds: SharedValue<Bounds>;
};

const LayerOverflowIndicator = ({ layer, layerSize, baseDisplayBounds }: LayerOverflowIndicatorProps) => {
  const bounds = baseDisplayBounds.value;
  if (!layerSize?.width || !layerSize?.height || !bounds.width || !bounds.height) {
    return null;
  }

  const maxWidthAtBaseScale1 = bounds.width * 0.6;
  const maxHeightAtBaseScale1 = bounds.height * 0.6;
  const aspect = layerSize.width / layerSize.height;
  let layerWidthAtBaseScale1 = maxWidthAtBaseScale1;
  let layerHeightAtBaseScale1 = layerWidthAtBaseScale1 / aspect;
  if (layerHeightAtBaseScale1 > maxHeightAtBaseScale1) {
    layerHeightAtBaseScale1 = maxHeightAtBaseScale1;
    layerWidthAtBaseScale1 = layerHeightAtBaseScale1 * aspect;
  }

  const layerWidth = layerWidthAtBaseScale1 * layer.transform.scale;
  const layerHeight = layerHeightAtBaseScale1 * layer.transform.scale;

  const baseCenterX = bounds.x + bounds.width / 2;
  const baseCenterY = bounds.y + bounds.height / 2;
  const centerX = baseCenterX + layer.transform.x;
  const centerY = baseCenterY + layer.transform.y;

  const rotationRadians = (layer.transform.rotation * Math.PI) / 180;
  const cosRotation = Math.cos(rotationRadians);
  const sinRotation = Math.sin(rotationRadians);
  const halfWidth = layerWidth / 2;
  const halfHeight = layerHeight / 2;

  // Axis-aligned bounding box that contains the rotated layer
  const halfBoundingWidth = Math.abs(halfWidth * cosRotation) + Math.abs(halfHeight * sinRotation);
  const halfBoundingHeight = Math.abs(halfWidth * sinRotation) + Math.abs(halfHeight * cosRotation);
  const bboxLeft = centerX - halfBoundingWidth;
  const bboxTop = centerY - halfBoundingHeight;
  const bboxRight = centerX + halfBoundingWidth;
  const bboxBottom = centerY + halfBoundingHeight;
  const bboxWidth = bboxRight - bboxLeft;
  const bboxHeight = bboxBottom - bboxTop;

  const baseLeft = bounds.x;
  const baseTop = bounds.y;
  const baseRight = bounds.x + bounds.width;
  const baseBottom = bounds.y + bounds.height;

  const overlays: Array<{ top: number; left: number; width: number; height: number }> = [];

  const topOverflow = Math.max(0, baseTop - bboxTop);
  if (topOverflow > 0) {
    overlays.push({
      top: bboxTop,
      left: bboxLeft,
      width: bboxWidth,
      height: Math.min(topOverflow, bboxHeight),
    });
  }

  const bottomOverflow = Math.max(0, bboxBottom - baseBottom);
  if (bottomOverflow > 0) {
    overlays.push({
      top: Math.max(baseBottom, bboxTop),
      left: bboxLeft,
      width: bboxWidth,
      height: Math.min(bottomOverflow, bboxHeight),
    });
  }

  const verticalOverlapTop = Math.max(bboxTop, baseTop);
  const verticalOverlapBottom = Math.min(bboxBottom, baseBottom);
  const verticalOverlapHeight = Math.max(0, verticalOverlapBottom - verticalOverlapTop);

  const leftOverflow = Math.max(0, baseLeft - bboxLeft);
  if (leftOverflow > 0 && verticalOverlapHeight > 0) {
    overlays.push({
      top: verticalOverlapTop,
      left: bboxLeft,
      width: Math.min(leftOverflow, bboxWidth),
      height: verticalOverlapHeight,
    });
  }

  const rightOverflow = Math.max(0, bboxRight - baseRight);
  if (rightOverflow > 0 && verticalOverlapHeight > 0) {
    overlays.push({
      top: verticalOverlapTop,
      left: Math.max(baseRight, bboxLeft),
      width: Math.min(rightOverflow, bboxWidth),
      height: verticalOverlapHeight,
    });
  }

  if (overlays.length === 0) {
    return null;
  }

  return (
    <>
      {overlays.map((overlay, index) => (
        <View
          key={`${layer.id}-overflow-${index}`}
          style={{
            position: 'absolute',
            top: overlay.top,
            left: overlay.left,
            width: overlay.width,
            height: overlay.height,
            borderWidth: 1,
            borderColor: 'rgba(255, 99, 71, 0.85)',
            borderStyle: 'dashed',
            backgroundColor: 'rgba(255, 99, 71, 0.12)',
            borderRadius: 2,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
};

type LayerDisplayProps = {
  layer: Layer;
  layerSize?: LayerSize;
  selected: boolean;
  baseDisplayBounds: SharedValue<Bounds>;
  gesture?: ReturnType<typeof Gesture.Simultaneous>;
  rotationGesture?: ReturnType<typeof Gesture.Pan>;
  resizeGesture?: ReturnType<typeof Gesture.Pan>;
};

const LayerDisplay = ({ layer, layerSize, selected, baseDisplayBounds, gesture, rotationGesture, resizeGesture }: LayerDisplayProps) => {
  const layerOpacity = typeof layer.transform.opacity === 'number' ? layer.transform.opacity : 1;
  const layerImageStyle: ImageStyle = { width: '100%', height: '100%', opacity: layerOpacity };

  const animatedStyle = useAnimatedStyle(() => {
    if (!layerSize?.width || !layerSize?.height) {
      return { position: 'absolute', width: 0, height: 0, opacity: 0 };
    }

    const bounds = baseDisplayBounds.value;

    // Calculate layer size at base image scale 1
    // Layers are now inside the base image container, so they scale automatically with it
    const maxWidthAtBaseScale1 = bounds.width * 0.6;
    const maxHeightAtBaseScale1 = bounds.height * 0.6;
    const aspect = layerSize.width / layerSize.height;
    let layerWidthAtBaseScale1 = maxWidthAtBaseScale1;
    let layerHeightAtBaseScale1 = layerWidthAtBaseScale1 / aspect;
    if (layerHeightAtBaseScale1 > maxHeightAtBaseScale1) {
      layerHeightAtBaseScale1 = maxHeightAtBaseScale1;
      layerWidthAtBaseScale1 = layerHeightAtBaseScale1 * aspect;
    }

    // Layer size at scale 1 (will be scaled by parent container)
    const layerWidth = layerWidthAtBaseScale1 * layer.transform.scale;
    const layerHeight = layerHeightAtBaseScale1 * layer.transform.scale;

    // Base center at scale 1 (anchor point for layers)
    // Position is relative to the base image container (which is 100% x 100%)
    // But the actual base image is at bounds.x, bounds.y with bounds.width x bounds.height
    // So we need to position layers relative to the actual base image center
    const baseCenterX = bounds.x + bounds.width / 2;
    const baseCenterY = bounds.y + bounds.height / 2;

    // Layer position: stored as offset from base center at scale 1
    // Since layers are inside the base image container, they automatically get the same transforms
    // We just need to position them relative to the actual base image center
    const offsetX = layer.transform.x;
    const offsetY = layer.transform.y;

    // Final position: base center + layer offset
    // The parent container will apply scale and translation automatically
    const left = baseCenterX + offsetX - layerWidth / 2;
    const top = baseCenterY + offsetY - layerHeight / 2;

    return {
      position: 'absolute',
      left,
      top,
      width: layerWidth,
      height: layerHeight,
      transform: [{ rotate: `${layer.transform.rotation}deg` }],
    };
  }, [layer, layerSize]);

  const layerContent = (
    <>
      <Image source={{ uri: layer.uri }} style={layerImageStyle} resizeMode='contain' />
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
    </>
  );

  return (
    <Animated.View style={[animatedStyle]} collapsable={false} pointerEvents='box-none'>
      {gesture ? (
        <GestureDetector gesture={gesture}>
          <View style={{ width: '100%', height: '100%' }} collapsable={false}>
            {layerContent}
          </View>
        </GestureDetector>
      ) : (
        <View style={{ width: '100%', height: '100%' }} collapsable={false}>
          {layerContent}
        </View>
      )}
      {selected && rotationGesture && (
        <View
          pointerEvents='box-none'
          style={{
            position: 'absolute',
            top: -48,
            left: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GestureDetector gesture={rotationGesture}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.85)',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 3,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text style={{ color: 'white', fontSize: 15, fontWeight: '600' }}>↻</Text>
            </View>
          </GestureDetector>
          <View
            pointerEvents='none'
            style={{
              width: 2,
              height: 18,
              backgroundColor: 'rgba(255,255,255,0.75)',
              marginTop: 4,
              borderRadius: 1,
            }}
          />
        </View>
      )}
      {selected && resizeGesture && (
        <GestureDetector gesture={resizeGesture}>
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              right: -8,
              width: 22,
              height: 22,
              backgroundColor: 'rgba(0,0,0,0.85)',
              borderRadius: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>⇲</Text>
          </View>
        </GestureDetector>
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
  const layerOpacity = typeof layer.transform.opacity === 'number' ? layer.transform.opacity : 1;
  // Compute style synchronously using useMemo for ViewShot compatibility
  const style = useMemo(() => {
    // Read values from shared values synchronously
    const bounds = baseDisplayBounds.value;
    const baseSize = baseImageSizeShared.value;

    if (!bounds.width || !bounds.height || !baseSize.width || !baseSize.height || !layerSize?.width || !layerSize?.height) {
      return null;
    }

    // In ViewShot, container is baseSize.width x baseSize.height
    // Base image uses resizeMode='contain', so we need to calculate actual image bounds
    const containerWidth = baseSize.width;
    const containerHeight = baseSize.height;
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = baseSize.width / baseSize.height;

    // Calculate actual base image bounds in ViewShot (with contain mode)
    let imageWidth = containerWidth;
    let imageHeight = containerHeight;
    let imageX = 0;
    let imageY = 0;
    if (imageRatio > containerRatio) {
      imageWidth = containerWidth;
      imageHeight = imageWidth / imageRatio;
      imageY = (containerHeight - imageHeight) / 2;
    } else {
      imageHeight = containerHeight;
      imageWidth = imageHeight * imageRatio;
      imageX = (containerWidth - imageWidth) / 2;
    }

    // Scale factor from display bounds (on screen) to ViewShot image bounds
    const scaleX = imageWidth / bounds.width;
    const scaleY = imageHeight / bounds.height;

    // Calculate layer size at base image scale 1 (in display bounds coordinates)
    const maxWidthAtBaseScale1 = bounds.width * 0.6;
    const maxHeightAtBaseScale1 = bounds.height * 0.6;
    const aspect = layerSize.width / layerSize.height;
    let layerWidthAtBaseScale1 = maxWidthAtBaseScale1;
    let layerHeightAtBaseScale1 = layerWidthAtBaseScale1 / aspect;
    if (layerHeightAtBaseScale1 > maxHeightAtBaseScale1) {
      layerHeightAtBaseScale1 = maxHeightAtBaseScale1;
      layerWidthAtBaseScale1 = layerHeightAtBaseScale1 * aspect;
    }

    // Layer size at scale 1 (in display bounds coordinates)
    const layerWidth = layerWidthAtBaseScale1 * layer.transform.scale;
    const layerHeight = layerHeightAtBaseScale1 * layer.transform.scale;

    // Layer position: stored as offset from base center in display bounds coordinates
    const offsetX = layer.transform.x;
    const offsetY = layer.transform.y;

    // Base center in ViewShot image coordinates
    const baseCenterX = imageX + imageWidth / 2;
    const baseCenterY = imageY + imageHeight / 2;

    // Convert layer position from display bounds to ViewShot image coordinates
    const layerOffsetXInBase = offsetX * scaleX;
    const layerOffsetYInBase = offsetY * scaleY;

    // Final position: base center + scaled layer offset
    const left = baseCenterX + layerOffsetXInBase - (layerWidth * scaleX) / 2;
    const top = baseCenterY + layerOffsetYInBase - (layerHeight * scaleY) / 2;

    return {
      position: 'absolute' as const,
      left,
      top,
      width: layerWidth * scaleX,
      height: layerHeight * scaleY,
      transform: [{ rotate: `${layer.transform.rotation}deg` }],
      opacity: layerOpacity,
    };
  }, [layer, layerSize, baseImageSizeShared, baseDisplayBounds, layerOpacity]);

  if (!style || !layerSize?.width || !layerSize?.height) {
    return null;
  }

  return (
    <View style={style}>
      <Image source={{ uri: layer.uri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />
    </View>
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
  const rotationGestureState = useRef<
    Record<string, { startRotation: number; previousAngle: number; accumulated: number; centerX: number; centerY: number }>
  >({});
  const resizeGestureState = useRef<Record<string, { startScale: number; startDistance: number; centerX: number; centerY: number }>>({});
  const containerRef = useRef<View | null>(null);
  const containerPageOffset = useRef({ x: 0, y: 0 });

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
      requestAnimationFrame(() => {
        containerRef.current?.measure?.((_, __, ___, ____, pageX = 0, pageY = 0) => {
          containerPageOffset.current = { x: pageX, y: pageY };
        });
      });
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
      const bounds = baseDisplayBounds.value;
      const scaledWidth = bounds.width * scale;
      const scaledHeight = bounds.height * scale;

      if (scale <= 1) {
        // When scale is 1 or less, allow movement within canvas bounds
        // Calculate how much the image can move (it's smaller than canvas)
        const maxTranslateX = (bounds.width - scaledWidth) / 2;
        const maxTranslateY = (bounds.height - scaledHeight) / 2;

        const nextX = basePanStartX.value + event.translationX;
        const nextY = basePanStartY.value + event.translationY;

        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, nextX));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, nextY));
      } else {
        // When scale > 1, keep image within canvas bounds
        const maxTranslateX = (scaledWidth - bounds.width) / 2;
        const maxTranslateY = (scaledHeight - bounds.height) / 2;

        const nextX = basePanStartX.value + event.translationX;
        const nextY = basePanStartY.value + event.translationY;

        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, nextX));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, nextY));
      }
    })
    .withTestId('basePan');

  // Base image pinch gesture - allow scale from 50% to 300%
  const basePinch = Gesture.Pinch()
    .onStart(() => {
      basePinchStartScale.value = baseScale.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newScale = Math.max(0.5, Math.min(3, basePinchStartScale.value * event.scale));
      baseScale.value = newScale;

      // Constrain translation when scaling
      const bounds = baseDisplayBounds.value;
      const scaledWidth = bounds.width * newScale;
      const scaledHeight = bounds.height * newScale;

      if (newScale <= 1) {
        // When scale is 1 or less, constrain to keep image within canvas
        const maxTranslateX = (bounds.width - scaledWidth) / 2;
        const maxTranslateY = (bounds.height - scaledHeight) / 2;
        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, baseTranslateX.value));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.value));
      } else {
        // When scale > 1, keep image within canvas bounds
        const maxTranslateX = (scaledWidth - bounds.width) / 2;
        const maxTranslateY = (scaledHeight - bounds.height) / 2;
        baseTranslateX.value = Math.max(-maxTranslateX, Math.min(maxTranslateX, baseTranslateX.value));
        baseTranslateY.value = Math.max(-maxTranslateY, Math.min(maxTranslateY, baseTranslateY.value));
      }
    })
    .onEnd(() => {
      'worklet';
      const currentScale = baseScale.value;
      const scalePercent = Math.round(currentScale * 100);

      // Snap to 100% if close to it (within 5% threshold)
      if (Math.abs(currentScale - 1.0) < 0.05) {
        baseScale.value = withTiming(1.0, { duration: 200 });
        baseTranslateX.value = withTiming(0, { duration: 200 });
        baseTranslateY.value = withTiming(0, { duration: 200 });
        runOnJS(setScalePercent)(100);
      } else {
        runOnJS(setScalePercent)(scalePercent);
      }
    });

  // Base image tap to deselect layers - only if not tapping on a layer
  // Double tap to reset scale to 100%
  const baseTap = Gesture.Tap()
    .maxDistance(10)
    .numberOfTaps(1)
    .onEnd(() => {
      'worklet';
      // Only deselect if no layer gesture is active
      runOnJS(onSelectLayer)(null);
    });

  const baseDoubleTap = Gesture.Tap()
    .maxDistance(10)
    .numberOfTaps(2)
    .onEnd(() => {
      'worklet';
      // Reset scale to 100% and center the image
      baseScale.value = withTiming(1, { duration: 200 });
      baseTranslateX.value = withTiming(0, { duration: 200 });
      baseTranslateY.value = withTiming(0, { duration: 200 });
      runOnJS(setScalePercent)(100);
    });

  // Base gesture should not interfere with layer gestures
  const baseGesture = Gesture.Simultaneous(basePan, basePinch, baseTap, baseDoubleTap);

  // Base image animated style
  const baseAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: baseScale.value }, { translateX: baseTranslateX.value }, { translateY: baseTranslateY.value }],
    };
  });

  // Constrain layer position to stay within base image bounds
  // This function calculates the bounding box of rotated/scaled layer and constrains its position
  const constrainLayerPosition = useCallback(
    (layer: Layer, layerSize: LayerSize, boundsAtScale1: { x: number; y: number; width: number; height: number }) => {
      // Calculate layer display size at base scale 1
      const maxWidthAtScale1 = boundsAtScale1.width * 0.6;
      const maxHeightAtScale1 = boundsAtScale1.height * 0.6;
      const aspect = layerSize.width / layerSize.height;
      let layerWidthAtScale1 = maxWidthAtScale1;
      let layerHeightAtScale1 = layerWidthAtScale1 / aspect;
      if (layerHeightAtScale1 > maxHeightAtScale1) {
        layerHeightAtScale1 = maxHeightAtScale1;
        layerWidthAtScale1 = layerHeightAtScale1 * aspect;
      }

      const scaledLayerWidthAtScale1 = layerWidthAtScale1 * layer.transform.scale;
      const scaledLayerHeightAtScale1 = layerHeightAtScale1 * layer.transform.scale;

      // Calculate bounding box of rotated and scaled layer
      const rotationRad = (layer.transform.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotationRad));
      const sin = Math.abs(Math.sin(rotationRad));

      // Bounding box dimensions for rotated rectangle
      const boundingWidth = scaledLayerWidthAtScale1 * cos + scaledLayerHeightAtScale1 * sin;
      const boundingHeight = scaledLayerWidthAtScale1 * sin + scaledLayerHeightAtScale1 * cos;

      // Base center at scale 1
      const baseCenterX = boundsAtScale1.x + boundsAtScale1.width / 2;
      const baseCenterY = boundsAtScale1.y + boundsAtScale1.height / 2;

      // Calculate constraints
      const halfWidth = boundingWidth / 2;
      const halfHeight = boundingHeight / 2;
      const minX = boundsAtScale1.x + halfWidth;
      const maxX = boundsAtScale1.x + boundsAtScale1.width - halfWidth;
      const minY = boundsAtScale1.y + halfHeight;
      const maxY = boundsAtScale1.y + boundsAtScale1.height - halfHeight;

      // Current layer center position
      const currentLayerCenterX = baseCenterX + layer.transform.x;
      const currentLayerCenterY = baseCenterY + layer.transform.y;

      // Constrain to base bounds
      const constrainedCenterX = Math.max(minX, Math.min(maxX, currentLayerCenterX));
      const constrainedCenterY = Math.max(minY, Math.min(maxY, currentLayerCenterY));

      // Convert back to offset from base center
      return {
        x: constrainedCenterX - baseCenterX,
        y: constrainedCenterY - baseCenterY,
      };
    },
    [],
  );

  // Track previous layer transforms to detect rotation/scale changes
  const prevLayerTransformsRef = useRef<Record<string, { rotation: number; scale: number }>>({});

  // Auto-constrain layer positions when rotation or scale changes
  useEffect(() => {
    if (!baseImageSize.width || !baseImageSize.height || !containerSize.width || !containerSize.height) {
      return;
    }

    // Calculate base display bounds
    const containerRatio = containerSize.width / containerSize.height;
    const imageRatio = baseImageSize.width / baseImageSize.height;

    let width = containerSize.width;
    let height = containerSize.height;
    if (imageRatio > containerRatio) {
      width = containerSize.width;
      height = width / imageRatio;
    } else {
      height = containerSize.height;
      width = height * imageRatio;
    }
    // Clean up removed layers from ref
    const currentLayerIds = new Set(layers.map((l) => l.id));
    Object.keys(prevLayerTransformsRef.current).forEach((id) => {
      if (!currentLayerIds.has(id)) {
        delete prevLayerTransformsRef.current[id];
      }
    });

    // Check each layer and constrain if rotation or scale changed
    const updatedLayers = layers.map((layer) => {
      const layerSize = layerSizes[layer.id];
      if (!layerSize?.width || !layerSize?.height) {
        return layer;
      }

      const prevTransform = prevLayerTransformsRef.current[layer.id];
      const currentRotation = layer.transform.rotation;
      const currentScale = layer.transform.scale;

      // Initialize or update previous transform
      if (!prevTransform) {
        prevLayerTransformsRef.current[layer.id] = { rotation: currentRotation, scale: currentScale };
        return layer;
      }

      // Only constrain if rotation or scale changed
      if (prevTransform.rotation === currentRotation && prevTransform.scale === currentScale) {
        return layer;
      }

      // Update previous transform
      prevLayerTransformsRef.current[layer.id] = { rotation: currentRotation, scale: currentScale };

      // Don't constrain position - allow layers to move outside base image bounds
      // Overflow areas are shown with an indicator so users see what is outside
      return layer;
    });

    // Only update if something changed
    const hasChanges = updatedLayers.some((updatedLayer, index) => {
      const originalLayer = layers[index];
      return updatedLayer.transform.x !== originalLayer.transform.x || updatedLayer.transform.y !== originalLayer.transform.y;
    });

    if (hasChanges) {
      onLayersChange(updatedLayers);
    }
  }, [layers, layerSizes, baseImageSize, containerSize, constrainLayerPosition, onLayersChange]);

  // Update layer position with constraints
  // Layers are now inside the base image container, so positions are in container coordinates (at scale 1)
  // When base image transforms, layers automatically transform with it
  const updateLayerPosition = useCallback(
    (layerId: string, newX: number, newY: number, boundsAtScale1: { x: number; y: number; width: number; height: number }) => {
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const layerSize = layerSizes[layerId];
      if (!layerSize?.width || !layerSize?.height) return;

      // Get base display bounds at scale 1
      const baseWidthAtScale1 = boundsAtScale1.width;
      const baseHeightAtScale1 = boundsAtScale1.height;

      // Calculate layer display size at base scale 1
      const maxWidthAtScale1 = baseWidthAtScale1 * 0.6;
      const maxHeightAtScale1 = baseHeightAtScale1 * 0.6;
      const aspect = layerSize.width / layerSize.height;
      let layerWidthAtScale1 = maxWidthAtScale1;
      let layerHeightAtScale1 = layerWidthAtScale1 / aspect;
      if (layerHeightAtScale1 > maxHeightAtScale1) {
        layerHeightAtScale1 = maxHeightAtScale1;
        layerWidthAtScale1 = layerHeightAtScale1 * aspect;
      }

      // Don't constrain position - allow layers to move outside base image bounds
      // Overflow areas are shown with an indicator so users see what is outside
      // Just use the new position directly
      onLayersChange(layers.map((l) => (l.id === layerId ? { ...l, transform: { ...l.transform, x: newX, y: newY } } : l)));
    },
    [layers, layerSizes, onLayersChange],
  );

  const updateLayerRotation = useCallback(
    (layerId: string, rotation: number) => {
      onLayersChange(layers.map((l) => (l.id === layerId ? { ...l, transform: { ...l.transform, rotation } } : l)));
    },
    [layers, onLayersChange],
  );

  const updateLayerScale = useCallback(
    (layerId: string, scale: number) => {
      onLayersChange(layers.map((l) => (l.id === layerId ? { ...l, transform: { ...l.transform, scale } } : l)));
    },
    [layers, onLayersChange],
  );

  const computeLayerCenterOnScreen = useCallback(
    (layer: Layer) => {
      const bounds = baseDisplayBounds.value;
      const baseCenterX = bounds.x + bounds.width / 2;
      const baseCenterY = bounds.y + bounds.height / 2;
      const layerCenterX = baseCenterX + layer.transform.x;
      const layerCenterY = baseCenterY + layer.transform.y;
      const scale = baseScale.value;
      const translateX = baseTranslateX.value;
      const translateY = baseTranslateY.value;
      return {
        x: containerPageOffset.current.x + layerCenterX * scale + translateX,
        y: containerPageOffset.current.y + layerCenterY * scale + translateY,
      };
    },
    [baseDisplayBounds, baseScale, baseTranslateX, baseTranslateY],
  );

  const handleRotationStart = useCallback(
    (layerId: string, layer: Layer, pointerX: number, pointerY: number) => {
      const center = computeLayerCenterOnScreen(layer);
      const vectorX = pointerX - center.x;
      const vectorY = pointerY - center.y;
      const initialAngle = Math.atan2(vectorY, vectorX);
      rotationGestureState.current[layerId] = {
        startRotation: layer.transform.rotation,
        previousAngle: initialAngle,
        accumulated: 0,
        centerX: center.x,
        centerY: center.y,
      };
    },
    [computeLayerCenterOnScreen],
  );

  const handleRotationUpdate = useCallback(
    (layerId: string, pointerX: number, pointerY: number) => {
      const state = rotationGestureState.current[layerId];
      if (!state) return;
      const vectorX = pointerX - state.centerX;
      const vectorY = pointerY - state.centerY;
      if (vectorX === 0 && vectorY === 0) {
        return;
      }
      const angle = Math.atan2(vectorY, vectorX);
      let delta = angle - state.previousAngle;
      if (delta > Math.PI) {
        delta -= Math.PI * 2;
      } else if (delta < -Math.PI) {
        delta += Math.PI * 2;
      }
      state.previousAngle = angle;
      state.accumulated += (delta * 180) / Math.PI;
      updateLayerRotation(layerId, state.startRotation + state.accumulated);
    },
    [updateLayerRotation],
  );

  const handleRotationEnd = useCallback((layerId: string) => {
    delete rotationGestureState.current[layerId];
  }, []);

  const handleResizeStart = useCallback(
    (layerId: string, layer: Layer, pointerX: number, pointerY: number) => {
      const center = computeLayerCenterOnScreen(layer);
      const vectorX = pointerX - center.x;
      const vectorY = pointerY - center.y;
      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
      resizeGestureState.current[layerId] = {
        startScale: layer.transform.scale,
        startDistance: Math.max(distance, 1),
        centerX: center.x,
        centerY: center.y,
      };
    },
    [computeLayerCenterOnScreen],
  );

  const handleResizeUpdate = useCallback(
    (layerId: string, pointerX: number, pointerY: number) => {
      const state = resizeGestureState.current[layerId];
      if (!state) return;
      const vectorX = pointerX - state.centerX;
      const vectorY = pointerY - state.centerY;
      const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
      if (distance <= 0) {
        return;
      }
      const ratio = distance / state.startDistance;
      const nextScale = Math.max(0.3, Math.min(5, state.startScale * ratio));
      updateLayerScale(layerId, nextScale);
    },
    [updateLayerScale],
  );

  const handleResizeEnd = useCallback((layerId: string) => {
    delete resizeGestureState.current[layerId];
  }, []);

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
  // Layers are now inside the base image container, so gestures work in container coordinates
  const createLayerPan = useCallback(
    (layer: Layer) => {
      const layerPanGesture = Gesture.Pan()
        .minDistance(1)
        .onStart(() => {
          'worklet';
          // Store position in container coordinates (at scale 1)
          layerPanStart.current[layer.id] = {
            x: layer.transform.x,
            y: layer.transform.y,
          };
          runOnJS(onSelectLayer)(layer.id);
        })
        .onUpdate((event) => {
          'worklet';
          const bounds = baseDisplayBounds.value;

          // Get layer size - need to access from closure
          const panStart = layerPanStart.current[layer.id];
          if (!panStart) return;

          // Calculate new position in container coordinates
          // Since layers are inside the base container, translation is already in container coordinates
          const newX = panStart.x + event.translationX / baseScale.value;
          const newY = panStart.y + event.translationY / baseScale.value;

          // Calculate constraints in JS callback
          // Pass bounds at scale 1 for calculating layer sizes and constraints
          runOnJS(updateLayerPosition)(layer.id, newX, newY, {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
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
    [baseScale, baseDisplayBounds, onSelectLayer, updateLayerPosition],
  );

  const createLayerRotation = useCallback(
    (layer: Layer) => {
      const rotationGesture = Gesture.Pan()
        .minDistance(1)
        .onStart((event) => {
          'worklet';
          runOnJS(onSelectLayer)(layer.id);
          runOnJS(handleRotationStart)(layer.id, layer, event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          'worklet';
          runOnJS(handleRotationUpdate)(layer.id, event.absoluteX, event.absoluteY);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(handleRotationEnd)(layer.id);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(handleRotationEnd)(layer.id);
        });

      return rotationGesture;
    },
    [handleRotationEnd, handleRotationStart, handleRotationUpdate, onSelectLayer],
  );

  const createLayerResize = useCallback(
    (layer: Layer) => {
      const resizeGesture = Gesture.Pan()
        .minDistance(1)
        .onStart((event) => {
          'worklet';
          runOnJS(onSelectLayer)(layer.id);
          runOnJS(handleResizeStart)(layer.id, layer, event.absoluteX, event.absoluteY);
        })
        .onUpdate((event) => {
          'worklet';
          runOnJS(handleResizeUpdate)(layer.id, event.absoluteX, event.absoluteY);
        })
        .onEnd(() => {
          'worklet';
          runOnJS(handleResizeEnd)(layer.id);
        })
        .onFinalize(() => {
          'worklet';
          runOnJS(handleResizeEnd)(layer.id);
        });

      return resizeGesture;
    },
    [handleResizeEnd, handleResizeStart, handleResizeUpdate, onSelectLayer],
  );

  useImperativeHandle(ref, () => ({
    capture: async () => {
      return await captureViewShotRef.current?.capture?.();
    },
  }));

  return (
    <View ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }} onLayout={handleLayout}>
      <GestureDetector gesture={baseGesture}>
        <Animated.View style={[{ width: '100%', height: '100%' }, baseAnimatedStyle]}>
          <Image source={{ uri: baseImageUri }} style={{ width: '100%', height: '100%' }} resizeMode='contain' />

          {/* Layers inside base image container - they automatically get the same transforms */}
          {layers.map((layer) => {
            const layerSize = layerSizes[layer.id];
            const isSelected = selectedLayerId === layer.id;
            const layerPan = createLayerPan(layer);
            const layerRotation = isSelected ? createLayerRotation(layer) : undefined;
            const layerResize = isSelected ? createLayerResize(layer) : undefined;

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
                gesture={layerGesture}
                rotationGesture={layerRotation}
                resizeGesture={layerResize}
              />
            );
          })}
          {layers.map((layer) => {
            const layerSize = layerSizes[layer.id];
            if (!layerSize?.width || !layerSize?.height) {
              return null;
            }
            return <LayerOverflowIndicator key={`${layer.id}-overflow`} layer={layer} layerSize={layerSize} baseDisplayBounds={baseDisplayBounds} />;
          })}
        </Animated.View>
      </GestureDetector>

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
