import { useCallback, useEffect, useRef, useState } from 'react';

import { View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import ViewShot from 'react-native-view-shot';

import ControlsPanel from '../components/ControlsPanel';
import Header from '../components/Header';
import ImageCanvas, { ImageCanvasHandle, type OverlayTransform } from '../components/ImageCanvas';
import PickingPlaceholder from '../components/PickingPlaceholder';
import ReviewPrompt from '../components/ReviewPrompt';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkAndMaybeUpdate } from '../utils/inAppUpdate';

const Index = () => {
  const [baseImageUri, setBaseImageUri] = useState<string | null>(null);
  const [overlayImageUri, setOverlayImageUri] = useState<string | null>(null);
  const [overlayTransform, setOverlayTransform] = useState<OverlayTransform>({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [saving, setSaving] = useState<boolean>(false);
  const [picking, setPicking] = useState<boolean>(false);
  const imageCanvasRef = useRef<ImageCanvasHandle | null>(null);
  const viewShotRef = useRef<ViewShot | null>(null);
  const { t } = useI18n();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
    })();
  }, []);

  useEffect(() => {
    // non-blocking check for Android in-app updates
    checkAndMaybeUpdate({ flexible: true }).catch(() => {});
  }, []);

  const pickBaseImage = async () => {
    if (picking) return;
    try {
      setPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled) {
        setBaseImageUri(result.assets[0].uri);
        setOverlayImageUri(null);
        setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
      }
    } finally {
      setPicking(false);
    }
  };

  const pickOverlayImage = async () => {
    if (!baseImageUri || picking) {
      if (!baseImageUri) {
        Toast.show({
          type: 'info',
          text1: t('addBasePhoto'),
          text2: t('selectBaseImage'),
          position: 'top',
          visibilityTime: 2500,
        });
      }
      return;
    }

    try {
      setPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (!result.canceled) {
        setOverlayImageUri(result.assets[0].uri);
        setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        imageCanvasRef.current?.resetOverlay();
      }
    } finally {
      setPicking(false);
    }
  };

  const handleOverlayTransformChange = useCallback((next: OverlayTransform) => {
    setOverlayTransform(next);
  }, []);

  const handleRotateOverlay = (delta: number) => {
    setOverlayTransform((prev) => ({
      ...prev,
      rotation: prev.rotation + delta,
    }));
  };

  const handleResetOverlay = () => {
    if (imageCanvasRef.current) {
      imageCanvasRef.current.resetOverlay();
    } else {
      setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
    }
  };

  const saveImage = async () => {
    if (!baseImageUri || saving) return;
    try {
      setSaving(true);
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        throw new Error('capture_failed');
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Toast.show({
        type: 'success',
        text1: t('saved'),
        text2: t('savedMessage'),
        position: 'top',
        visibilityTime: 3000,
      });
    } catch {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save image',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <Header onSettingsPress={() => router.push('/settings')} />
      <View style={{ flex: 1, padding: 16, paddingTop: 4, gap: 12 }}>
        <View
          style={{
            flex: 1,
            borderRadius: 16,
            backgroundColor: theme.surface,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {baseImageUri ? (
            <ViewShot ref={viewShotRef} style={{ flex: 1, width: '100%' }} options={{ format: 'png', quality: 1 }} collapsable={false}>
              <ImageCanvas ref={imageCanvasRef} baseImageUri={baseImageUri} overlayImageUri={overlayImageUri} overlayTransform={overlayTransform} onOverlayTransformChange={handleOverlayTransformChange} />
            </ViewShot>
          ) : (
            <PickingPlaceholder picking={picking} onPick={pickBaseImage} />
          )}
        </View>

        {baseImageUri && (
          <ControlsPanel
            hasBaseImage={!!baseImageUri}
            hasOverlayImage={!!overlayImageUri}
            overlayRotation={overlayTransform.rotation}
            onPickBase={pickBaseImage}
            onPickOverlay={pickOverlayImage}
            onRemoveOverlay={() => {
              setOverlayImageUri(null);
              setOverlayTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
            }}
            onResetOverlay={handleResetOverlay}
            onRotateOverlay={handleRotateOverlay}
            saving={saving}
            onSave={saveImage}
          />
        )}
      </View>
      <Toast />
      <ReviewPrompt />
    </SafeAreaView>
  );
};

export default Index;
