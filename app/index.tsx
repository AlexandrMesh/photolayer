import { useEffect, useRef, useState } from 'react';

import { View } from 'react-native';

import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import ControlsPanel from '../components/ControlsPanel';
import Header from '../components/Header';
import ImageCanvas, { ImageCanvasHandle } from '../components/ImageCanvas';
import PickingPlaceholder from '../components/PickingPlaceholder';
import ReviewPrompt from '../components/ReviewPrompt';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkAndMaybeUpdate } from '../utils/inAppUpdate';

const Index = () => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [angle, setAngle] = useState<number>(0);
  const [angleInput, setAngleInput] = useState<string>('0');
  const [saving, setSaving] = useState<boolean>(false);
  const [picking, setPicking] = useState<boolean>(false);
  const imageCanvasRef = useRef<ImageCanvasHandle | null>(null);
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

  const pickImage = async () => {
    if (picking) return;
    try {
      setPicking(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (!result.canceled) {
        // reset all adjustments when picking a new image
        resetAll();
        imageCanvasRef.current?.resetTransform();
        setImageUri(result.assets[0].uri);
      }
    } finally {
      setPicking(false);
    }
  };

  const resetAll = () => {
    setAngle(0);
    setAngleInput('0');
  };

  const saveImage = async () => {
    if (!imageUri || saving) return;
    try {
      setSaving(true);

      // Определяем формат исходного изображения
      const getImageFormat = (uri: string): ImageManipulator.SaveFormat => {
        const extension = uri.toLowerCase().split('.').pop();
        switch (extension) {
          case 'png':
            return ImageManipulator.SaveFormat.PNG;
          case 'webp':
            return ImageManipulator.SaveFormat.WEBP;
          case 'jpeg':
          case 'jpg':
          default:
            return ImageManipulator.SaveFormat.JPEG;
        }
      };

      const originalFormat = getImageFormat(imageUri);

      // На Android/iOS достаточно ранее выданного доступа на медиатеку (через ImagePicker).
      const manipulated = await ImageManipulator.manipulateAsync(imageUri, [{ rotate: Math.round(angle) }], {
        compress: originalFormat === ImageManipulator.SaveFormat.PNG ? 1 : 0.9,
        format: originalFormat,
      });

      await MediaLibrary.saveToLibraryAsync(manipulated.uri);
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
          {imageUri ? (
            <ImageCanvas ref={imageCanvasRef} imageUri={imageUri} angle={angle} onPickAnother={pickImage} />
          ) : (
            <PickingPlaceholder picking={picking} onPick={pickImage} />
          )}
        </View>

        {imageUri && (
          <ControlsPanel
            angle={angle}
            angleInput={angleInput}
            onAngleInputChange={(t) => {
              const cleaned = t.replace(/[^0-9-]/g, '');
              const normalized = cleaned.replace(/(?!^)-/g, '');
              setAngleInput(normalized);
            }}
            onAngleCommit={() => {
              const n = Number.parseInt(angleInput || '0', 10);
              const clamped = Math.max(-180, Math.min(180, isNaN(n) ? 0 : n));
              setAngle(clamped);
              setAngleInput(String(clamped));
            }}
            onReset={() => {
              resetAll();
              imageCanvasRef.current?.resetTransform();
            }}
            onAngleChange={(value) => {
              // clamp and normalize smoothly
              let next = Math.max(-180, Math.min(180, Math.round(value)));
              if (next > 180) next -= 360;
              if (next < -180) next += 360;
              setAngle(next);
              setAngleInput(String(next));
            }}
            onSliderCommit={(value) => {
              let next = Math.max(-180, Math.min(180, Math.round(value)));
              if (next > 180) next -= 360;
              if (next < -180) next += 360;
              setAngle(next);
              setAngleInput(String(next));
            }}
            onPickAnother={() => {
              // allow user to choose another image
              pickImage();
            }}
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
