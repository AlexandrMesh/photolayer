import { useState } from 'react';

import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import LanguageSelector from '../components/LanguageSelector';
import Modal from '../components/Modal';
import SettingItem from '../components/SettingItem';
import ThemeSelector from '../components/ThemeSelector';
import { useI18n } from '../contexts/I18nContext';
import { useTheme } from '../contexts/ThemeContext';
import { checkUpdateAvailable, startFlexibleUpdate } from '../utils/inAppUpdate';

const Settings = () => {
  const { theme } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { themeMode, setThemeMode } = useTheme();
  const router = useRouter();

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  const appVersion = '1.0.0'; // Из app.json

  const handleFeedback = () => {
    const email = 'mobileemailap@gmail.com';
    const subject = 'Photo Layer - Feedback';
    const body = 'Hi,\n\nI would like to share my feedback about Photo Layer app:\n\n';

    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open email app');
    });
  };

  const getThemeLabel = (mode: string) => {
    switch (mode) {
      case 'system':
        return t('auto');
      case 'light':
        return t('light');
      case 'dark':
        return t('dark');
      default:
        return t('auto');
    }
  };

  const getLanguageLabel = (lang: string) => {
    switch (lang) {
      case 'ru':
        return t('russian');
      case 'en':
        return t('english');
      case 'auto':
        return t('auto');
      default:
        return t('auto');
    }
  };

  const handleThemeSelect = (theme: 'system' | 'light' | 'dark') => {
    setThemeMode(theme);
    setShowThemeModal(false);
  };

  const handleLanguageSelect = (lang: 'auto' | 'en' | 'ru') => {
    setLanguage(lang);
    setShowLanguageModal(false);
  };

  const openUpdatesModal = () => {
    setShowUpdatesModal(true);
    setCheckResult(null);
    setUpdateAvailable(false);
  };

  const handleCheckUpdate = async () => {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    setCheckResult(null);
    const available = await checkUpdateAvailable();
    setUpdateAvailable(available);
    setCheckResult(available ? t('updateAvailable') : t('noUpdateAvailable'));
    setCheckingUpdate(false);
  };

  const handleStartUpdate = async () => {
    await startFlexibleUpdate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Header с кнопкой назад */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: theme.background,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            {
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: theme.button,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: theme.border,
              marginRight: 16,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons name='arrow-back' size={24} color={theme.primary} />
        </Pressable>

        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: 'bold',
            flex: 1,
          }}
        >
          {t('settings')}
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <SettingItem title={t('theme')} value={getThemeLabel(themeMode)} onPress={() => setShowThemeModal(true)} icon='color-palette-outline' />

        <SettingItem title={t('language')} value={getLanguageLabel(language)} onPress={() => setShowLanguageModal(true)} icon='language-outline' />

        <SettingItem title={t('feedback')} value={t('sendFeedback')} onPress={handleFeedback} icon='mail-outline' />

        <SettingItem
          title={t('appVersion')}
          value={`${appVersion} • ${t('checkForUpdates')}`}
          onPress={openUpdatesModal}
          icon='information-circle-outline'
        />
      </ScrollView>

      {/* Theme Selection Modal */}
      <Modal visible={showThemeModal} onClose={() => setShowThemeModal(false)} title={t('theme')}>
        <ThemeSelector currentTheme={themeMode} onThemeSelect={handleThemeSelect} />
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={showLanguageModal} onClose={() => setShowLanguageModal(false)} title={t('language')}>
        <LanguageSelector currentLanguage={language} onLanguageSelect={handleLanguageSelect} />
      </Modal>

      {/* Updates Modal */}
      <Modal visible={showUpdatesModal} onClose={() => setShowUpdatesModal(false)} title={t('appVersion')}>
        <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>
          {t('currentVersion')}: {appVersion}. {t('checkForUpdatesBelow')}
        </Text>

        {checkResult && (
          <Text
            style={{
              color: updateAvailable ? theme.primary : theme.textSecondary,
              marginBottom: 16,
              fontWeight: updateAvailable ? '600' : '400',
              textAlign: 'center',
            }}
          >
            {checkResult}
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Pressable
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            style={({ pressed }) => [
              {
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: theme.button,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
                flex: 1,
              },
            ]}
          >
            <Text style={{ color: theme.text, textAlign: 'center' }}>{checkingUpdate ? t('checking') : t('check')}</Text>
          </Pressable>

          {updateAvailable && (
            <Pressable
              onPress={handleStartUpdate}
              style={({ pressed }) => [
                {
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 10,
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.9 : 1,
                  flex: 1,
                },
              ]}
            >
              <Text style={{ color: 'white', fontWeight: '600', textAlign: 'center' }}>{t('update')}</Text>
            </Pressable>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;
