import { StyleSheet, View, Image, TouchableOpacity, ImageSourcePropType, Platform, useColorScheme } from 'react-native';
import { ThemedText } from './ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { HOST_URL } from '@/config/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const avatarImages: Record<string, ImageSourcePropType> = {
  '1': require('../assets/images/avatars/1.png'),
  '2': require('../assets/images/avatars/2.png'),
  '3': require('../assets/images/avatars/3.png'),
  '4': require('../assets/images/avatars/4.png'),
  '5': require('../assets/images/avatars/5.png'),
  '6': require('../assets/images/avatars/6.png'),
  '7': require('../assets/images/avatars/7.png'),
  '8': require('../assets/images/avatars/8.png'),
  '9': require('../assets/images/avatars/9.png'),
  'default': require('../assets/images/avatars/8.png'),
};

interface LearnerInfo {
  name: string;
  avatar?: string;
  points?: number;
  streak?: number;
  school?: string;
}

interface StreakInfo {
  calculatedFromProgress: boolean;
  id: number;
  lastActivityDate: string;
  streak: number;
  uid: string;
}

function getInitial(name?: string) {
  if (!name) return '';
  return name.trim().charAt(0).toUpperCase();
}

export function Header() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLearnerInfo() {
      try {
        const authData = await SecureStore.getItemAsync('auth');
        if (!authData) {
          setIsLoading(false);
          return;
        }
        const { user } = JSON.parse(authData);
        if (!user?.uid) {
          setIsLoading(false);
          return;
        }
        const [learnerResponse, streakResponse] = await Promise.all([
          fetch(`${HOST_URL}/api/language-learners/uid/${user.uid}`),
          fetch(`${HOST_URL}/api/language-learners/${user.uid}/streak`)
        ]);

        if (!learnerResponse.ok || !streakResponse.ok) {
          throw new Error('Failed to fetch learner info');
        }

        const [learnerData, streakData] = await Promise.all([
          learnerResponse.json(),
          streakResponse.json()
        ]);

        setLearnerInfo(learnerData);
        setStreakInfo(streakData);
      } catch (error) {
        console.error('Error fetching learner info:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLearnerInfo();
  }, []);

  const avatarSource = learnerInfo?.avatar && avatarImages[learnerInfo.avatar]
    ? avatarImages[learnerInfo.avatar]
    : avatarImages['default'];

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
      <View style={styles.row}>
        <View style={styles.greetingSection}>
          <ThemedText style={[styles.greetingText, { color: isDark ? '#F3F4F6' : '#22223B' }]}>
            Dimpo Language <ThemedText style={styles.wave}>🇿🇦</ThemedText>
          </ThemedText>
          <ThemedText style={[styles.schoolText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
            Learn to speak Mzansi
          </ThemedText>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={[styles.avatarCircle, { backgroundColor: isDark ? '#7C3AED' : '#8B5CF6' }]}>
            {learnerInfo?.avatar ? (
              <Image
                source={avatarSource}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <ThemedText style={styles.avatarInitial}>
                {getInitial(learnerInfo?.name) || 'U'}
              </ThemedText>
            )}
          </View>
        </TouchableOpacity>
      </View>
      <View style={[styles.card, { backgroundColor: isDark ? '#374151' : '#FFF' }]}>
        <View style={styles.cardColumn}>
          <MaterialCommunityIcons name="trophy-outline" size={32} color="#F59E0B" style={styles.icon} />
          <ThemedText style={[styles.cardLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>Your Points</ThemedText>
          <ThemedText style={[styles.cardValue, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>{learnerInfo?.points ?? 0}</ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: isDark ? '#4B5563' : '#E5E7EB' }]} />
        <View style={styles.cardColumn}>
          <MaterialCommunityIcons name="fire" size={32} color="#EF4444" style={styles.icon} />
          <ThemedText style={[styles.cardLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>Learning Streak</ThemedText>
          <ThemedText style={[styles.cardValue, { color: isDark ? '#60A5FA' : '#3B82F6' }]}>{streakInfo?.streak ?? 0}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '700',
  },
  wave: {
    fontSize: 22,
  },
  schoolText: {
    fontSize: 15,
    marginTop: 2,
    fontWeight: '500',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 15,
    marginTop: 2,
    marginBottom: 2,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 48,
    borderRadius: 1,
  },
}); 