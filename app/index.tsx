import { useCallback, useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import Header from '../components/Header';
import ImageCanvas, { ImageCanvasHandle, type Layer, type LayerTransform } from '../components/ImageCanvas';
import LayersBottomSheet from '../components/LayersBottomSheet';
import PickingPlaceholder from '../components/PickingPlaceholder';
import ReviewPrompt from '../components/ReviewPrompt';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkAndMaybeUpdate } from '../utils/inAppUpdate';

const Index = () => {
  const [baseImageUri, setBaseImageUri] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [picking, setPicking] = useState<boolean>(false);
  const [layersSheetVisible, setLayersSheetVisible] = useState(false);
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
        setLayers([]);
        setSelectedLayerId(null);
      }
    } finally {
      setPicking(false);
    }
  };

  const pickLayerImage = async () => {
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
        const newLayer: Layer = {
          id: `layer-${Date.now()}-${Math.random()}`,
          uri: result.assets[0].uri,
          transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
        };
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayerId(newLayer.id);
        setLayersSheetVisible(true);
      }
    } finally {
      setPicking(false);
    }
  };

  const handleLayersChange = useCallback((newLayers: Layer[]) => {
    setLayers(newLayers);
  }, []);

  const handleUpdateLayerTransform = useCallback((layerId: string, transform: Partial<LayerTransform>) => {
    setLayers((prev) => prev.map((layer) => (layer.id === layerId ? { ...layer, transform: { ...layer.transform, ...transform } } : layer)));
  }, []);

  const handleRemoveLayer = useCallback(
    (layerId: string) => {
      setLayers((prev) => prev.filter((layer) => layer.id !== layerId));
      if (selectedLayerId === layerId) {
        setSelectedLayerId(null);
      }
    },
    [selectedLayerId],
  );

  const saveImage = async () => {
    if (!baseImageUri || saving) return;
    try {
      setSaving(true);
      const uri = await imageCanvasRef.current?.capture();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, position: 'relative' }}>
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
            <ImageCanvas
              ref={imageCanvasRef}
              baseImageUri={baseImageUri}
              layers={layers}
              onLayersChange={handleLayersChange}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onBaseImageChange={pickBaseImage}
              onAddLayer={pickLayerImage}
              onRemoveLayer={handleRemoveLayer}
              showAddLayerHint={layers.length === 0}
            />
          ) : (
            <PickingPlaceholder picking={picking} onPick={pickBaseImage} />
          )}
        </View>

        {baseImageUri && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => setLayersSheetVisible(true)}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: theme.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name='layers-outline' size={20} color='white' />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{t('layers')}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={saveImage}
              disabled={saving}
              style={({ pressed }) => [
                {
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                  backgroundColor: saving ? 'rgba(34,197,94,0.5)' : '#34C759',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name='content-save-outline' size={20} color='white' />
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>{saving ? t('saving') : t('save')}</Text>
              </View>
            </Pressable>
          </View>
        )}
      </View>

      {picking && (
        <View
          pointerEvents='auto'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15,23,42,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 20,
              borderRadius: 16,
              backgroundColor: theme.surface,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ActivityIndicator size='large' color={theme.primary} />
            <Text style={{ color: theme.textSecondary, fontSize: 16 }}>{t('loading')}</Text>
          </View>
        </View>
      )}

      {saving && (
        <View
          pointerEvents='auto'
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <View
            style={{
              paddingHorizontal: 24,
              paddingVertical: 20,
              borderRadius: 16,
              backgroundColor: theme.surface,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <ActivityIndicator size='large' color={theme.primary} />
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '500' }}>{t('saving')}</Text>
          </View>
        </View>
      )}

      <LayersBottomSheet
        visible={layersSheetVisible}
        layers={layers}
        selectedLayerId={selectedLayerId}
        onSelectLayer={setSelectedLayerId}
        onRemoveLayer={handleRemoveLayer}
        onUpdateLayerTransform={handleUpdateLayerTransform}
        onClose={() => setLayersSheetVisible(false)}
        onAddLayer={pickLayerImage}
      />

      <Toast />
      <ReviewPrompt />
    </SafeAreaView>
  );
};

export default Index;
