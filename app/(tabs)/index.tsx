import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Header } from '@/components/Header';
import { LANGUAGE_EMOJIS } from '@/components/language-emojis';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { analytics } from '@/services/analytics';
import { Language } from '@/types/language';

// Speaker data for South African languages
const SPEAKERS_DATA: Record<string, { speakers: number; percentage: number }> = {
  Zulu: { speakers: 15130000, percentage: 24.4 },
  Xhosa: { speakers: 10110000, percentage: 16.3 },
  Afrikaans: { speakers: 6570000, percentage: 10.6 },
  Sepedi: { speakers: 6200000, percentage: 10.0 },
  English: { speakers: 5390000, percentage: 8.7 },
  Tswana: { speakers: 5150000, percentage: 8.3 },
  Sesotho: { speakers: 4840000, percentage: 7.8 },
  Xitsonga: { speakers: 2910000, percentage: 4.7 },
  Swati: { speakers: 1740000, percentage: 2.8 },
  Venda: { speakers: 1150000, percentage: 2.5 },
  Ndebele: { speakers: 1050000, percentage: 1.7 },
  'Sign Language': { speakers: 12400, percentage: 0.02 },
  Other: { speakers: 1300000, percentage: 2.1 },
};

// Unique color for each language card - updated for dark mode compatibility
const LANGUAGE_COLORS: Record<string, { light: string; dark: string }> = {
  Zulu: { light: '#FDE68A', dark: '#92400E' },
  Xhosa: { light: '#E0E7FF', dark: '#3730A3' },
  Afrikaans: { light: '#FEF3C7', dark: '#92400E' },
  English: { light: '#DBEAFE', dark: '#1E40AF' },
  Sepedi: { light: '#FDE68A', dark: '#92400E' },
  Tswana: { light: '#F3F4F6', dark: '#374151' },
  Sesotho: { light: '#E0F2FE', dark: '#0369A1' },
  Xitsonga: { light: '#DCFCE7', dark: '#166534' },
  Swati: { light: '#FCE7F3', dark: '#831843' },
  Venda: { light: '#F3E8FF', dark: '#6B21A8' },
  Ndebele: { light: '#F3F4F6', dark: '#374151' },
  'Sign Language': { light: '#E5E7EB', dark: '#4B5563' },
  Other: { light: '#F1F5F9', dark: '#334155' },
};

// Helper to map API language names to speakers data keys
function getSpeakersKey(languageName: string): string {
  switch (languageName) {
    case 'Zulu': return 'Zulu';
    case 'Xhosa': return 'Xhosa';
    case 'Afrikaans': return 'Afrikaans';
    case 'English': return 'English';
    case 'Sepedi': return 'Sepedi';
    case 'Tswana': return 'Tswana';
    case 'Sesotho': return 'Sesotho';
    case 'Xitsonga': return 'Xitsonga';
    case 'Swati': return 'Swati';
    case 'Venda': return 'Venda';
    case 'Ndebele': return 'Ndebele';
    default: return languageName;
  }
}

function formatSpeakers(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M speakers`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K speakers`;
  return `${num} speakers`;
}

export default function HomeScreen() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    async function fetchLanguages() {
      try {
        const response = await fetch(`${HOST_URL}/api/languages`);
        const data = await response.json();
        setLanguages(data);
      } catch (err) {
        setError('Error fetching languages');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLanguages();
  }, []);

  // Track home screen view
  useEffect(() => {
    analytics.track('languages_home_screen_viewed', {
      languages_count: languages.length,
      is_loading: isLoading,
      has_error: !!error
    });
  }, [languages.length, isLoading, error]);

  const handleLanguagePress = (language: Language) => {
    if (language.enabled === false) {
      return;
    }

    // Track language selection
    analytics.track('languages_language_selected', {
      language_code: language.code,
      language_name: language.name,
      language_native_name: language.nativeName,
      speakers_count: SPEAKERS_DATA[getSpeakersKey(language.name)]?.speakers || 0,
      speakers_percentage: SPEAKERS_DATA[getSpeakersKey(language.name)]?.percentage || 0
    });

    router.push({
      pathname: '/lessons',
      params: {
        languageCode: language.code,
        languageName: language.name
      }
    });
  };

  const handleShareApp = async () => {
    try {
      // Track app sharing
      analytics.track('languages_app_shared', {
        platform: 'home_screen',
        share_method: 'native_share'
      });

      const iosLink = 'https://apps.apple.com/app/dimpo-languages/6742684696';
      const androidLink = 'https://play.google.com/store/apps/details?id=com.dimpolanguages';
      
      await Share.share({
        message: `Check out this amazing South African languages learning app! 🌍🇿🇦 Learn Zulu, Xhosa, Afrikaans, and more with interactive lessons.\n\nDownload now:\n📱 iOS: ${iosLink}\n🤖 Android: ${androidLink}`,
        title: 'Dimpo Languages App',
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 20,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      opacity: 0.7,
    },
    titleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    languagesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
      paddingBottom: 24,
    },
    languageCard: {
      paddingVertical: 28,
      paddingHorizontal: 20,
      borderRadius: 18,
      minWidth: 180,
      alignItems: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDark ? colors.border : '#e6e6e6',
    },
    languageCardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    languageCardDisabled: {
      opacity: 0.5,
    },
    languageEmoji: {
      fontSize: 40,
      marginBottom: 10,
      paddingTop: 20,
    },
    languageName: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 2,
      color: colors.text,
    },
    languageNativeName: {
      fontSize: 14,
      opacity: 0.7,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    languageSpeakers: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    comingSoon: {
      marginTop: 6,
      fontSize: 13,
      fontWeight: '600',
      color: isDark ? '#cbd5e1' : '#334155',
    },
    headerImage: {
      height: 200,
      width: '100%',
    },
    shareButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 40,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    shareButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <ScrollView style={{ flex: 1 }}>
      <Header />
      <ThemedView style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText style={styles.loadingText}>Loading languages...</ThemedText>
          </View>
        ) : error ? (
          <ThemedText>{error}</ThemedText>
        ) : (
          <View>
            <ThemedView style={styles.languagesContainer}>
              {languages
                .filter(l => l.name !== 'English' && l.name !== 'Afrikaans')
                .sort((a, b) => {
                  const speakersA = SPEAKERS_DATA[getSpeakersKey(a.name)]?.speakers || 0;
                  const speakersB = SPEAKERS_DATA[getSpeakersKey(b.name)]?.speakers || 0;
                  return speakersB - speakersA;
                })
                .map((language) => {
                  const isEnabled = language.enabled !== false;
                  return (
                  <Pressable
                    key={language.id}
                    style={({ pressed }) => [
                      [
                        styles.languageCard,
                        {
                          backgroundColor: LANGUAGE_COLORS[language.name]
                            ? (isDark
                              ? LANGUAGE_COLORS[language.name].dark
                              : LANGUAGE_COLORS[language.name].light)
                            : isDark
                              ? colors.surface
                              : '#fff'
                        },
                      ],
                      !isEnabled && styles.languageCardDisabled,
                      pressed && isEnabled && styles.languageCardPressed,
                    ]}
                    onPress={() => handleLanguagePress(language)}
                    disabled={!isEnabled}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${language.name}`}
                    accessibilityState={{ disabled: !isEnabled }}
                  >
                    <ThemedText style={styles.languageEmoji}>
                      {LANGUAGE_EMOJIS[language.name] || '🌍'}
                    </ThemedText>
                    <ThemedText style={styles.languageName}>
                      {language.name}
                    </ThemedText>
                    <ThemedText style={styles.languageNativeName}>
                      {language.nativeName}
                    </ThemedText>
                    {(() => {
                      if (!isEnabled) {
                        return (
                          <ThemedText style={styles.comingSoon}>Coming soon</ThemedText>
                        );
                      }
                      const key = getSpeakersKey(language.name);
                      const speakers = SPEAKERS_DATA[key]?.speakers;
                      return speakers ? (
                        <ThemedText style={styles.languageSpeakers}>
                          {formatSpeakers(speakers)}
                        </ThemedText>
                      ) : null;
                    })()}
                  </Pressable>
                )})}
            </ThemedView>
            
            <Pressable
              style={({ pressed }) => [
                styles.shareButton,
                pressed && styles.shareButtonPressed,
              ]}
              onPress={handleShareApp}
              accessibilityRole="button"
              accessibilityLabel="Share app"
            >
              <ThemedText style={styles.shareButtonText}>
              🔗 Invite friends
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}
