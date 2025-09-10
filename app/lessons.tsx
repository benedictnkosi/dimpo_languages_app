import { Paywall } from '@/app/components/Paywall';
import { UpgradeToProButton } from '@/app/components/UpgradeToProButton';
import { LessonHeader } from '@/components/LessonHeader';
import { ThemedText } from '@/components/ThemedText';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { analytics } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Lesson {
    id: number;
    title: string;
    lessonOrder: number;
    unitId: number;
    unitName: string;
    hasLanguageWords: boolean;
    unitOrder: number;
    unitDescription?: string;
}

interface Unit {
    id: number;
    name: string;
    description?: string;
    lessons: Lesson[];
    unitOrder: number;
}

interface LessonProgress {
    id: number;
    lessonId: number;
    lessonTitle: string;
    unitId: number;
    status: 'started' | 'completed' | 'not_started';
    lastUpdate: string;
}

interface UnitResources {
    audio: string[];
    images: string[];
}

interface DownloadProgress {
    total: number;
    completed: number;
}

// Add new interface for tracking current unit
interface CurrentUnit {
    id: number;
    lastAccessed: Date;
}

// Add interface for daily lesson tracking
interface DailyLessonCount {
    count: number;
    date: string; // ISO date string (YYYY-MM-DD)
}

interface Learner {
    id: number;
    uid: string;
    name: string;
    created: string;
    lastSeen: string;
    email: string;
    points: number;
    streak: number;
    streakLastUpdated: string;
    avatar: string;
    expoPushToken: string;
    followMeCode: string;
    version: string;
    os: string;
    reminders: boolean;
    subscription: 'free' | 'premium';
}

const LESSON_STATUS = {
    completed: { icon: '⭐️', color: '#22c55e', label: 'Perfect!' },
    started: { icon: '✅', color: '#fbbf24', label: 'In Progress' },
    not_started: { icon: '🎯', color: '#38bdf8', label: 'Locked' },
};

// Helper functions for persistent downloaded unit tracking
const DOWNLOADED_UNITS_KEY = 'downloadedUnitIds';

const getDownloadedUnitIds = async (): Promise<number[]> => {
    const stored = await AsyncStorage.getItem(DOWNLOADED_UNITS_KEY);
    return stored ? JSON.parse(stored) : [];
};

const addDownloadedUnitId = async (unitId: number) => {
    const ids = await getDownloadedUnitIds();
    if (!ids.includes(unitId)) {
        ids.push(unitId);
        await AsyncStorage.setItem(DOWNLOADED_UNITS_KEY, JSON.stringify(ids));
    }
};

const removeDownloadedUnitId = async (unitId: number) => {
    const ids = await getDownloadedUnitIds();
    const newIds = ids.filter(id => id !== unitId);
    await AsyncStorage.setItem(DOWNLOADED_UNITS_KEY, JSON.stringify(newIds));
};

export default function LessonsScreen() {
    const { languageCode, languageName } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [learnerProgress, setLearnerProgress] = useState<LessonProgress[]>([]);
    const [downloadedResources, setDownloadedResources] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [currentUnit, setCurrentUnit] = useState<CurrentUnit | null>(null);
    const [learner, setLearner] = useState<Learner | null>(null);
    const [dailyLessonCount, setDailyLessonCount] = useState<DailyLessonCount>({ count: 0, date: '' });
    const [showDailyLimitModal, setShowDailyLimitModal] = useState(false);
    const router = useRouter();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [showPaywall, setShowPaywall] = useState(false);
    const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
    const [downloadedUnitIds, setDownloadedUnitIds] = useState<number[]>([]);

    // Function to get today's date in YYYY-MM-DD format
    const getTodayString = (): string => {
        return new Date().toISOString().split('T')[0];
    };

    // Function to check and update daily lesson count
    const checkDailyLessonLimit = useCallback(async () => {
        if (learner?.subscription !== 'free') {
            return { canTakeLesson: true, remainingLessons: -1 };
        }

        const today = getTodayString();
        
        // Check if we need to reset the daily count (new day)
        if (dailyLessonCount.date !== today) {
            setDailyLessonCount({ count: 0, date: today });
            return { canTakeLesson: true, remainingLessons: 3 };
        }

        const remainingLessons = 3 - dailyLessonCount.count;
        return { canTakeLesson: remainingLessons > 0, remainingLessons };
    }, [learner?.subscription, dailyLessonCount]);

    // Function to increment daily lesson count
    const incrementDailyLessonCount = useCallback(async () => {
        if (learner?.subscription !== 'free') {
            return;
        }

        const today = getTodayString();
        const newCount = dailyLessonCount.date === today ? dailyLessonCount.count + 1 : 1;
        setDailyLessonCount({ count: newCount, date: today });

        // Store in secure storage for persistence
        try {
            await SecureStore.setItemAsync('dailyLessonCount', JSON.stringify({ count: newCount, date: today }));
        } catch (error) {
            console.error('[App] Error saving daily lesson count:', error);
        }
    }, [learner?.subscription, dailyLessonCount]);

    // Function to load daily lesson count from storage
    const loadDailyLessonCount = useCallback(async () => {
        try {
            const stored = await SecureStore.getItemAsync('dailyLessonCount');
            if (stored) {
                const parsed: DailyLessonCount = JSON.parse(stored);
                const today = getTodayString();
                
                // Reset count if it's a new day
                if (parsed.date !== today) {
                    setDailyLessonCount({ count: 0, date: today });
                } else {
                    setDailyLessonCount(parsed);
                }
            }
        } catch (error) {
            console.error('[App] Error loading daily lesson count:', error);
        }
    }, []);

    // Load daily lesson count on component mount
    useEffect(() => {
        loadDailyLessonCount();
    }, [loadDailyLessonCount]);

    // Track lessons screen view
    useEffect(() => {
        analytics.track('languages_lessons_screen_viewed', {
            language_code: languageCode,
            language_name: languageName,
            units_count: units.length,
            total_lessons: units.reduce((total, unit) => total + unit.lessons.length, 0),
            is_loading: isLoading,
            has_error: !!error,
            user_subscription: learner?.subscription || 'unknown',
            daily_lessons_remaining: learner?.subscription === 'free' ? (3 - dailyLessonCount.count) : -1
        });
    }, [languageCode, languageName, units.length, isLoading, error, learner?.subscription, dailyLessonCount.count]);

    // Function to fetch learner data
    const fetchLearner = useCallback(async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                throw new Error('No auth data found');
            }
            const { user } = JSON.parse(authData);

            const response = await fetch(`${HOST_URL}/api/language-learners/uid/${user.uid}`);
            if (!response.ok) {
                throw new Error('Failed to fetch learner data');
            }

            const learnerData: Learner = await response.json();
            setLearner(learnerData);
        } catch (error) {
            console.error('[App] Error fetching learner data:', error);
        }
    }, []);

    // Use focus effect to fetch learner data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchLearner();
        }, [fetchLearner])
    );

    // Function to determine if a unit is locked
    const isUnitLocked = (unitId: number): boolean => {
        const unit = units.find(u => u.id === unitId);
        if (!unit) {
            return true;
        }

        const minOrder = Math.min(...units.map(u => u.unitOrder));
        if (unit.unitOrder === minOrder) {
            return false;
        }

        const prevUnit = units.find(u => u.unitOrder === unit.unitOrder - 1);
        if (!prevUnit) {
            return true;
        }

        const allPrevCompleted = prevUnit.lessons.every(lesson => {
            const progress = learnerProgress.find(p => p.lessonId === lesson.id);
            return progress?.status === 'completed';
        });

        return !allPrevCompleted;
    };

    // Function to determine if a lesson is locked
    const isLessonLocked = (unitId: number, lessonId: number): boolean => {
        // Check for free member restrictions - lock unit 3 lesson 2 and onwards
        if (learner?.subscription === 'free') {
            const unit = units.find(u => u.id === unitId);
            if (unit && unit.unitOrder >= 3) {
                const lesson = unit.lessons.find(l => l.id === lessonId);
                if (lesson && lesson.lessonOrder >= 2) {
                    return true;
                }
            }

            // Check daily lesson limit for free users
            const today = getTodayString();
            if (dailyLessonCount.date === today && dailyLessonCount.count >= 3) {
                return true;
            }
        }
        
        // If the unit is locked, all its lessons are locked
        const unitLocked = isUnitLocked(unitId);
        if (unitLocked) {
            return true;
        }

        // If there's no progress, only unlock the first lesson of the lowest order unit
        if (learnerProgress.length === 0) {
            const lowestOrderUnit = units.reduce((lowest, current) =>
                (current.unitOrder < lowest.unitOrder) ? current : lowest
            );
            const unitLessons = lowestOrderUnit.lessons;
            const lowestOrderLesson = unitLessons.reduce((lowest, current) =>
                (current.lessonOrder < lowest.lessonOrder) ? current : lowest
            );
            const locked = unitId !== lowestOrderUnit.id || lessonId !== lowestOrderLesson.id;
            return locked;
        }

        // Find the highest lesson order that has been started or completed in this unit
        const unitLessons = units.find(u => u.id === unitId)?.lessons || [];
        const highestLessonOrder = Math.max(
            ...learnerProgress
                .filter(p =>
                    p.unitId === unitId &&
                    (p.status === 'started' || p.status === 'completed')
                )
                .map(p => {
                    const lesson = unitLessons.find(l => l.id === p.lessonId);
                    return lesson?.lessonOrder || 0;
                })
        );

        // Find the current lesson's order
        const currentLesson = unitLessons.find(l => l.id === lessonId);
        const currentLessonOrder = currentLesson?.lessonOrder || 0;

        // If the previous lesson is completed, unlock this lesson
        const previousLesson = unitLessons.find(l => l.lessonOrder === currentLessonOrder - 1);
        if (previousLesson) {
            const previousLessonProgress = learnerProgress.find(p => p.lessonId === previousLesson.id);
            if (previousLessonProgress?.status === 'completed') {
                return false;
            }
        }

        // If no progress in this unit, unlock the first lesson
        if (highestLessonOrder === -Infinity) {
            const minOrder = Math.min(...unitLessons.map(l => l.lessonOrder));
            const unlocked = currentLessonOrder === minOrder;
            return !unlocked;
        }

        // Lock if this lesson's order is higher than the highest started/completed lesson
        const locked = currentLessonOrder > highestLessonOrder;
        return locked;
    };

    // Function to download a single resource
    const downloadResource = async (resourceName: string, type: 'audio' | 'image'): Promise<void> => {
        if (downloadedResources.has(resourceName)) {
            return;
        }

        const endpoint = type === 'audio'
            ? `${HOST_URL}/api/word/audio/get/${resourceName}`
            : `${HOST_URL}/api/word/image/get/${resourceName}`;

        const fileUri = `${FileSystem.documentDirectory}${type}/${resourceName}`;

        // Check if file already exists
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                console.log(`[Audio Download] File already exists: ${resourceName}`);
                setDownloadedResources(prev => new Set([...prev, resourceName]));
                setDownloadProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1
                } : null);
                return;
            }
        } catch (error) {
            console.error(`[Resource] Error checking file existence for ${type} ${resourceName}:`, error);
        }

        try {
            console.log(`[Audio Download] Starting download: ${resourceName} from ${endpoint}`);
            const downloadResumable = FileSystem.createDownloadResumable(
                endpoint,
                fileUri,
                {}
            );

            const downloadResult = await downloadResumable.downloadAsync();

            if (!downloadResult) {
                throw new Error('Download failed - no result returned');
            }

            if (downloadResult.status === 200) {
                console.log(`[Audio Download] Successfully downloaded: ${resourceName} to ${fileUri}`);
                setDownloadedResources(prev => new Set([...prev, resourceName]));
                setDownloadProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1
                } : null);
            } else {
                console.error(`[Resource] Failed to download ${type} ${resourceName} - Status: ${downloadResult.status}`);
            }
        } catch (error) {
            console.error(`[Resource] Error downloading ${type} ${resourceName}:`, error);
        }
    };

    // Function to download all resources for a unit
    const downloadUnitResources = async (unitId: number) => {
        try {
            console.log('[downloadUnitResources] called with unitId:', unitId);
            // Fetch resource list
            const response = await fetch(`${HOST_URL}/api/unit-resources/${unitId}/${languageCode}`);
            if (!response.ok) {
                console.error(`[Unit ${unitId}] Failed to fetch resource list - Status: ${response.status}`);
                throw new Error('Failed to fetch resource list');
            }

            const resources: UnitResources = await response.json();
            const totalResources = resources.audio.length + resources.images.length;

            console.log(`[Audio Download] Unit ${unitId}: Found ${resources.audio.length} audio files and ${resources.images.length} image files`);
            console.log(`[Audio Download] Unit ${unitId}: Audio files to download:`, resources.audio);

            // Initialize download progress
            setDownloadProgress({
                total: totalResources,
                completed: 0
            });

            // Create directories if they don't exist
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}audio`, { intermediates: true });
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}image`, { intermediates: true });

            // Download all resources
            const downloadPromises = [
                ...resources.audio.map(audio => downloadResource(audio, 'audio')),
                ...resources.images.map(image => downloadResource(image, 'image'))
            ];

            await Promise.all(downloadPromises);
            console.log(`[Audio Download] Unit ${unitId}: All downloads completed successfully`);
            setDownloadProgress(null);
        } catch (error) {
            console.error(`[Unit ${unitId}] Error in resource download process:`, error);
            setDownloadProgress(null);
        }
    };

    // Function to fetch learner progress
    const fetchProgress = useCallback(async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                throw new Error('No auth data found');
            }
            const { user } = JSON.parse(authData);

            const progressResponse = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress/${languageCode}`);
            if (progressResponse.ok) {
                const progress: LessonProgress[] = await progressResponse.json();
                setLearnerProgress(progress);
                return progress;
            } else if (progressResponse.status !== 404) {
                throw new Error('Failed to fetch progress');
            } else {
                setLearnerProgress([]);
                return [];
            }
        } catch (error) {
            console.error('[App] Error fetching progress:', error);
            return [];
        }
    }, [languageCode]);

    // Use focus effect to fetch progress when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchProgress();
        }, [fetchProgress])
    );

    useEffect(() => {
        async function fetchData() {
            try {
                // Get learner UID from secure storage
                const authData = await SecureStore.getItemAsync('auth');
                if (!authData) {
                    throw new Error('No auth data found');
                }
                // Fetch lessons first
                const lessonsResponse = await fetch(`${HOST_URL}/api/lessons?language=${languageCode}`);
                if (!lessonsResponse.ok) {
                    throw new Error('Failed to fetch lessons');
                }
                const lessons: Lesson[] = await lessonsResponse.json();

                // Fetch initial progress
                const progress: LessonProgress[] = await fetchProgress();

                // Group lessons by unit
                const unitMap = new Map<number, Unit>();
                lessons.forEach(lesson => {
                    if (!unitMap.has(lesson.unitId)) {
                        unitMap.set(lesson.unitId, {
                            id: lesson.unitId,
                            name: lesson.unitName,
                            description: lesson.unitDescription,
                            lessons: [],
                            unitOrder: lesson.unitOrder
                        });
                    }
                    unitMap.get(lesson.unitId)?.lessons.push(lesson);
                });

                // Sort units by unitOrder
                const sortedUnits = Array.from(unitMap.values()).sort((a, b) => a.unitOrder - b.unitOrder);

                // Sort lessons within each unit
                sortedUnits.forEach(unit => {
                    unit.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
                });

                setUnits(sortedUnits);

            } catch (err) {
                console.error('[App] Error in data fetch process:', err);
                setError('Error fetching lessons');
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [languageCode]);

    // Add function to delete resources for a specific unit
    const deleteUnitResources = async (unitId: number) => {
        try {
            // Fetch resource list to know what to delete
            const response = await fetch(`${HOST_URL}/api/unit-resources/${unitId}/${languageCode}`);
            if (!response.ok) {
                console.error(`[Unit ${unitId}] Failed to fetch resource list for cleanup`);
                return;
            }

            const resources: UnitResources = await response.json();

            // Delete audio files
            for (const audioFile of resources.audio) {
                const fileUri = `${FileSystem.documentDirectory}audio/${audioFile}`;
                try {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                } catch (error) {
                    console.error(`[Unit ${unitId}] Error deleting audio file ${audioFile}:`, error);
                }
            }

            // Delete image files
            for (const imageFile of resources.images) {
                const fileUri = `${FileSystem.documentDirectory}image/${imageFile}`;
                try {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                } catch (error) {
                    console.error(`[Unit ${unitId}] Error deleting image file ${imageFile}:`, error);
                }
            }

            // Update downloaded resources state
            setDownloadedResources(prev => {
                const newSet = new Set(prev);
                resources.audio.forEach(audio => newSet.delete(audio));
                resources.images.forEach(image => newSet.delete(image));
                return newSet;
            });

            // Remove from persistent storage
            await removeDownloadedUnitId(unitId);
            setDownloadedUnitIds(prev => prev.filter(id => id !== unitId));

        } catch (error) {
            console.error(`[Unit ${unitId}] Error in resource cleanup:`, error);
        }
    };

    // Modify handleLessonPress to handle unit changes
    const handleLessonPress = async (lesson: Lesson) => {
        // Track lesson selection
        analytics.track('languages_lesson_selected', {
            lesson_id: lesson.id,
            lesson_title: lesson.title,
            lesson_order: lesson.lessonOrder,
            unit_id: lesson.unitId,
            unit_name: lesson.unitName,
            unit_order: lesson.unitOrder,
            language_code: languageCode,
            language_name: languageName,
            user_subscription: learner?.subscription || 'unknown',
            daily_lessons_remaining: learner?.subscription === 'free' ? (3 - dailyLessonCount.count) : -1,
            is_unit_locked: isUnitLocked(lesson.unitId),
            is_lesson_locked: isLessonLocked(lesson.unitId, lesson.id),
            lesson_progress: getLessonProgress(lesson.id)?.status || 'not_started'
        });

        // Check daily lesson limit for free users
        if (learner?.subscription === 'free') {
            const { canTakeLesson } = await checkDailyLessonLimit();
            if (!canTakeLesson) {
                // Track daily limit hit
                analytics.track('languages_daily_limit_reached', {
                    language_code: languageCode,
                    language_name: languageName,
                    lesson_id: lesson.id,
                    lesson_title: lesson.title,
                    daily_lessons_completed: dailyLessonCount.count,
                    user_subscription: learner?.subscription || 'free'
                });
                setShowDailyLimitModal(true);
                return;
            }
        }

        // Check if we're switching units
        if (currentUnit && currentUnit.id !== lesson.unitId) {
            // Delete resources from the old unit
            await deleteUnitResources(currentUnit.id);
            await removeDownloadedUnitId(currentUnit.id);
            setDownloadedUnitIds(prev => prev.filter(id => id !== currentUnit.id));
            // Update current unit
            setCurrentUnit({
                id: lesson.unitId,
                lastAccessed: new Date()
            });
        } else if (!currentUnit) {
            // First time accessing a unit
            setCurrentUnit({
                id: lesson.unitId,
                lastAccessed: new Date()
            });
        }

        // Download resources for the new unit if not already downloaded
        const shouldDownload = !downloadedUnitIds.includes(lesson.unitId);
        console.log('[handleLessonPress] shouldDownload:', shouldDownload);
        console.log('[handleLessonPress] downloadedUnitIds:', downloadedUnitIds);
        if (shouldDownload) {
            try {   
                await downloadUnitResources(lesson.unitId);
                await addDownloadedUnitId(lesson.unitId);
                setDownloadedUnitIds(prev => [...prev, lesson.unitId]);
            } catch (error) {
                console.error('[App] Error downloading resources for new unit:', error);
                // Continue with navigation even if download fails
            }
        }

        // Rest of the existing handleLessonPress code...
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                throw new Error('No auth data found');
            }
            const { user } = JSON.parse(authData);

            const progressResponse = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: lesson.id,
                    language: languageCode,
                    status: 'started'
                })
            });

            if (!progressResponse.ok) {
                throw new Error('Failed to update progress');
            }

            const updatedProgress = await progressResponse.json();

            setLearnerProgress(prev => {
                const existingProgress = prev.find(p => p.lessonId === lesson.id);
                if (existingProgress) {
                    if (existingProgress.status === 'completed') {
                        return prev;
                    }
                    return prev.map(p => p.lessonId === lesson.id ? updatedProgress : p);
                }
                return [...prev, updatedProgress];
            });
        } catch (error) {
            console.error('[App] Error updating learner progress:', error);
        }


        router.push({
            pathname: '/lesson',
            params: {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                languageCode: languageCode as string,
                unitName: lesson.unitName,
                lessonNumber: lesson.lessonOrder,
            }
        });
    };

    const getLessonProgress = (lessonId: number) => {
        return learnerProgress.find(p => p.lessonId === lessonId);
    };

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const shouldShow = offsetY > 300;

        if (shouldShow !== showScrollTop) {
            setShowScrollTop(shouldShow);
            Animated.timing(fadeAnim, {
                toValue: shouldShow ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    };

    const scrollToTop = () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    function LessonCard({
        lesson,
        progress,
        locked,
        onPress,
    }: {
        lesson: Lesson;
        progress?: LessonProgress;
        locked: boolean;
        onPress: () => void;
    }) {
        let status: keyof typeof LESSON_STATUS = 'not_started';
        if (progress?.status === 'completed') status = 'completed';
        else if (progress?.status === 'started') status = 'started';

        const { icon, color, label } = LESSON_STATUS[status];

        // Check if this lesson is locked due to daily limit
        const isDailyLimitLocked = learner?.subscription === 'free' && 
            dailyLessonCount.date === getTodayString() && 
            dailyLessonCount.count >= 3;

        // Theme-aware colors
        const cardBg = locked
            ? (isDark ? colors.surfaceHigh : '#f1f5f9')
            : (isDark ? colors.surface : '#fff');
        const borderCol = locked
            ? (isDark ? colors.border : '#e5e7eb')
            : color;
        const iconCol = locked
            ? (isDark ? colors.textSecondary : '#a1a1aa')
            : color;
        const textCol = locked
            ? (isDark ? colors.textSecondary : '#A1A1AA')
            : colors.text;
        const statusCol = locked
            ? (isDark ? colors.textSecondary : '#a1a1aa')
            : color;

        return (
            <Pressable
                onPress={onPress}
                disabled={locked}
                style={[styles.lessonCard, { backgroundColor: cardBg, borderColor: borderCol }, locked && styles.lessonCardLocked]}
                accessibilityRole="button"
                accessibilityLabel={locked ? 'Locked lesson' : 'Lesson'}
            >
                <View style={styles.lessonIconContainer}>
                    <ThemedText style={[styles.lessonIcon, { color: iconCol }]}>{icon}</ThemedText>
                </View>
                <ThemedText style={[styles.lessonLevel, { color: textCol }, locked && styles.lessonTitleLocked]}>
                    {lesson.title}
                </ThemedText>
                <ThemedText style={[styles.lessonStatus, { color: statusCol }]}>
                    {locked 
                        ? (isDailyLimitLocked ? 'Daily limit reached' : 'Locked') 
                        : (status === 'not_started' ? 'Continue' : label)
                    }
                </ThemedText>
            </Pressable>
        );
    }

    function ProgressCard({
        completed,
        total,
        level,
    }: {
        completed: number;
        total: number;
        level: number;
    }) {
        const percent = total > 0 ? completed / total : 0;
        const [dailyLimitInfo, setDailyLimitInfo] = useState<{ remainingLessons: number }>({ remainingLessons: -1 });
        
        // Check daily limit on component mount and when learner changes
        useEffect(() => {
            const checkLimit = async () => {
                const result = await checkDailyLessonLimit();
                setDailyLimitInfo({ remainingLessons: result.remainingLessons });
            };
            checkLimit();
        }, [learner?.subscription, dailyLessonCount]);
        
        return (
            <View style={styles.progressCard}>
                <View style={styles.progressCardHeader}>
                    <ThemedText style={styles.progressCardTitle}>Your Progress</ThemedText>
                    <View style={styles.progressLevelBadge}>
                        <Ionicons name="trophy" size={16} color="#22c55e" />
                        <ThemedText style={styles.progressLevelText}>Level {level}</ThemedText>
                    </View>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percent * 100}%` }]} />
                </View>
                <ThemedText style={styles.progressCardSubtext}>
                    {completed} of {total} levels completed
                </ThemedText>
                {learner?.subscription === 'free' && dailyLimitInfo.remainingLessons >= 0 && (
                    <View style={styles.dailyLimitContainer}>
                        <Ionicons name="time-outline" size={16} color={colors.primary} />
                        <ThemedText style={styles.dailyLimitText}>
                            {dailyLimitInfo.remainingLessons} free lessons remaining today
                        </ThemedText>
                        <ThemedText style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
                          Unlock unlimited lessons, advanced analytics, exclusive content, and more with Pro!
                        </ThemedText>
                        <View style={styles.dailyLimitUpgradeButtonWrapper}>
                            <UpgradeToProButton
                                style={styles.dailyLimitUpgradeButton}
                                onPress={() => {
                                    analytics.track('languages_upgrade_from_progress_card', {
                                        language_code: languageCode,
                                        language_name: languageName,
                                        daily_lessons_remaining: dailyLimitInfo.remainingLessons,
                                        trigger: 'progress_card'
                                    });
                                    setIsUpgradeLoading(true);
                                    setShowPaywall(true);
                                }}
                                loading={isUpgradeLoading}
                            />
                        </View>
                    </View>
                )}
            </View>
        );
    }

    function UnitCard({ unit }: { unit: Unit }) {
        const isLocked = isUnitLocked(unit.id);
        const isPremiumLocked = learner?.subscription === 'free' && unit.unitOrder > 2;

        return (
            <View style={styles.unitCardWrapper}>
                <LinearGradient
                    colors={isLocked ? ['#94A3B8', '#64748B'] : ['#2563EB', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.unitCard}
                >
                    <View style={styles.unitCardIconContainer}>
                        <Ionicons name="cube-outline" size={32} color="#fff" style={{ opacity: 0.85 }} />
                    </View>
                    <View style={styles.unitCardTextContainer}>
                        <View style={styles.unitCardTitleContainer}>
                            <ThemedText style={styles.unitCardTitle}>{unit.name}</ThemedText>
                        </View>
                        {unit.description && (
                            <ThemedText style={styles.unitCardDescription}>{unit.description}</ThemedText>
                        )}
                        {isPremiumLocked && (
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={12} color="#FCD34D" />
                                <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
        );
    }

    // Calculate overall progress above the return statement
    const allLessons = units.flatMap(u => u.lessons);
    const completedLessons = allLessons.filter(l => {
        const progress = getLessonProgress(l.id);
        return progress?.status === 'completed';
    }).length;
    const currentLevel = completedLessons + 1;

    // Daily Limit Modal Component
    function DailyLimitModal() {
        return (
            <Modal
                visible={showDailyLimitModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDailyLimitModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.dailyLimitModalContainer}>
                        <View style={styles.dailyLimitIconContainer}>
                            <Ionicons name="time" size={48} color={colors.primary} />
                        </View>
                        <ThemedText style={styles.dailyLimitModalTitle}>
                            Daily Limit Reached! 🕐
                        </ThemedText>
                        <ThemedText style={styles.dailyLimitModalDescription}>
                            You've completed your 3 free lessons for today. Come back tomorrow for more learning, or upgrade to Premium for unlimited access!
                        </ThemedText>
                        <View style={styles.dailyLimitModalButtons}>
                            <ThemedText style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 8, flex: 1 }}>
                              Upgrade to Pro for unlimited lessons, exclusive content, and more!
                            </ThemedText>
                            <Pressable
                                style={[styles.dailyLimitButton, styles.dailyLimitButtonSecondary]}
                                onPress={() => {
                                    analytics.track('languages_daily_limit_dismissed', {
                                        language_code: languageCode,
                                        language_name: languageName,
                                        daily_lessons_completed: dailyLessonCount.count,
                                        user_subscription: learner?.subscription || 'free'
                                    });
                                    setShowDailyLimitModal(false);
                                }}
                            >
                                <ThemedText style={styles.dailyLimitButtonTextSecondary}>
                                    Maybe Later
                                </ThemedText>
                            </Pressable>
                            <UpgradeToProButton
                                style={{ flex: 1, marginLeft: 12 }}
                                onPress={() => {
                                    analytics.track('languages_upgrade_from_daily_limit', {
                                        language_code: languageCode,
                                        language_name: languageName,
                                        daily_lessons_completed: dailyLessonCount.count,
                                        trigger: 'daily_limit_modal'
                                    });
                                    setShowDailyLimitModal(false);
                                    setIsUpgradeLoading(true);
                                    setShowPaywall(true);
                                }}
                                loading={isUpgradeLoading}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

    // Function to load downloaded unit IDs from AsyncStorage
    const loadDownloadedUnitIds = useCallback(async () => {
        const ids = await getDownloadedUnitIds();
        setDownloadedUnitIds(ids);
    }, []);

    // Load downloaded unit IDs on component mount
    useEffect(() => {
        loadDownloadedUnitIds();
    }, [loadDownloadedUnitIds]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? colors.background : '#F8FAFC',
        },
        scrollView: {
            flex: 1,
        },
        unitContainer: {
            marginBottom: 32,
            marginHorizontal: 8,
        },
        unitHeader: {
            backgroundColor: colors.primary,
            padding: 16,
            marginHorizontal: 8,
            marginTop: 16,
            borderRadius: 14,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
        },
        unitHeaderLocked: {
            backgroundColor: isDark ? colors.surfaceHigh : '#94A3B8',
        },
        unitName: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.buttonText,
            flex: 1,
        },
        lessonsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'flex-start',
            paddingHorizontal: 8,
            paddingBottom: 8,
        },
        lessonCard: {
            width: '31%',
            margin: '1%',
            borderRadius: 16,
            borderWidth: 2,
            alignItems: 'center',
            paddingVertical: 18,
            paddingHorizontal: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
            backgroundColor: isDark ? colors.surface : '#fff',
            minWidth: 100,
            maxWidth: 140,
        },
        lessonCardLocked: {
            opacity: 0.5,
        },
        lessonIconContainer: {
            marginBottom: 8,
        },
        lessonIcon: {
            fontSize: 24,
        },
        lessonLevel: {
            fontSize: 15,
            fontWeight: 'bold',
            marginBottom: 2,
            color: colors.text,
        },
        lessonStatus: {
            fontSize: 13,
            fontWeight: '600',
            marginTop: 2,
        },
        lessonTitleLocked: {
            color: isDark ? colors.textSecondary : '#A1A1AA',
        },
        lockedText: {
            fontSize: 16,
            marginLeft: 12,
            color: isDark ? colors.textSecondary : '#A1A1AA',
            fontWeight: '500',
        },
        downloadProgressContainer: {
            width: '100%',
            padding: 16,
            backgroundColor: isDark ? colors.surfaceHigh : '#EFF6FF',
            borderRadius: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
            marginHorizontal: 0,
            marginTop: 16,
            marginBottom: 16,
        },
        downloadProgressHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
        },
        downloadProgressTitle: {
            fontSize: 15,
            fontWeight: 'bold',
            color: colors.primary,
        },
        downloadProgressCount: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.primary,
        },
        progressBarContainer: {
            height: 8,
            backgroundColor: isDark ? colors.surfaceHigh : '#DBEAFE',
            borderRadius: 4,
            overflow: 'hidden',
        },
        progressBar: {
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 4,
        },
        scrollTopButton: {
            position: 'absolute',
            right: 20,
            bottom: 20,
            zIndex: 1000,
        },
        scrollTopPressable: {
            backgroundColor: colors.primary,
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
        },
        scrollTopPressed: {
            transform: [{ scale: 0.95 }],
            backgroundColor: isDark ? colors.surfaceHigh : '#1D4ED8',
        },
        scrollTopText: {
            fontSize: 24,
            color: colors.buttonText,
            fontWeight: 'bold',
        },
        unitProgressBarContainer: {
            marginHorizontal: 16,
            marginTop: 8,
            marginBottom: 4,
            alignItems: 'flex-start',
        },
        unitProgressBarBg: {
            width: '100%',
            height: 8,
            backgroundColor: isDark ? colors.surfaceHigh : '#e5e7eb',
            borderRadius: 4,
            overflow: 'hidden',
        },
        unitProgressBarFill: {
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 4,
        },
        unitProgressText: {
            fontSize: 12,
            color: colors.primary,
            marginTop: 4,
            fontWeight: '500',
        },
        progressCard: {
            backgroundColor: isDark ? colors.surface : '#fff',
            borderRadius: 18,
            padding: 20,
            margin: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
        },
        progressCardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
        },
        progressCardTitle: {
            fontSize: 17,
            fontWeight: 'bold',
            color: colors.text,
        },
        progressLevelBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? colors.surfaceHigh : '#e0fbe3',
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 3,
        },
        progressLevelText: {
            color: colors.success,
            fontWeight: 'bold',
            marginLeft: 4,
            fontSize: 14,
        },
        progressBarBg: {
            width: '100%',
            height: 10,
            backgroundColor: isDark ? colors.surfaceHigh : '#e5e7eb',
            borderRadius: 5,
            overflow: 'hidden',
            marginBottom: 8,
        },
        progressBarFill: {
            height: '100%',
            backgroundColor: colors.success,
            borderRadius: 5,
        },
        progressCardSubtext: {
            fontSize: 13,
            color: isDark ? colors.textSecondary : '#64748B',
            marginTop: 2,
            fontWeight: '500',
        },
        unitCard: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 20,
            padding: 24,
            marginHorizontal: 16,
            marginTop: 16,
            marginBottom: 12,
            justifyContent: 'space-between',
        },
        unitCardIconContainer: {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(255,255,255,0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 16,
        },
        unitCardTextContainer: {
            flex: 1,
            marginLeft: 16,
        },
        unitCardTitleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 2,
        },
        unitCardTitle: {
            color: colors.buttonText,
            fontSize: 16,
            fontWeight: 'bold',
        },
        unitCardDescription: {
            color: isDark ? colors.textSecondary : '#e0e7ef',
            fontSize: 14,
            marginBottom: 0,
        },
        unitCardLessonCount: {
            color: colors.buttonText,
            fontSize: 15,
            fontWeight: '500',
            marginTop: 8,
            textAlign: 'right',
            alignSelf: 'flex-end',
        },
        premiumBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDark ? 'rgba(252, 211, 77, 0.15)' : 'rgba(252, 211, 77, 0.2)',
            borderRadius: 12,
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginTop: 10,
            alignSelf: 'flex-start',
            shadowColor: '#7C5700', 
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 2,
        },
        premiumBadgeText: {
            color: '#7C5700',
            fontSize: 12,
            fontWeight: 'bold',
            marginLeft: 4,
        },
        modal: {
            margin: 0,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalView: {
            width: '100%',
            alignItems: 'stretch',
            marginTop: 0,
            marginBottom: 0,
            paddingHorizontal: 0,
        },
        bunnyImage: {
            width: 100,
            height: 100,
            marginBottom: 16,
        },
        dailyLimitContainer: {
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 8,
        },
        dailyLimitText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '500',
            marginLeft: 4,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
        },
        dailyLimitModalContainer: {
            backgroundColor: isDark ? colors.surface : '#fff',
            padding: 20,
            borderRadius: 20,
            width: '80%',
            maxWidth: 400,
            alignItems: 'center',
        },
        dailyLimitIconContainer: {
            backgroundColor: colors.primary,
            borderRadius: 24,
            padding: 12,
            marginBottom: 16,
        },
        dailyLimitModalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: colors.text,
            marginBottom: 8,
        },
        dailyLimitModalDescription: {
            color: isDark ? colors.textSecondary : '#64748B',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 20,
        },
        dailyLimitModalButtons: {
            flexDirection: 'row',
            justifyContent: 'space-around',
            width: '100%',
        },
        dailyLimitButton: {
            padding: 12,
            borderRadius: 8,
            backgroundColor: colors.primary,
        },
        dailyLimitButtonSecondary: {
            backgroundColor: isDark ? colors.surfaceHigh : '#e5e7eb',
        },
        dailyLimitButtonTextSecondary: {
            color: colors.text,
            fontSize: 14,
            fontWeight: 'bold',
        },
        dailyLimitButtonPrimary: {
            backgroundColor: colors.primary,
        },
        dailyLimitButtonTextPrimary: {
            color: colors.buttonText,
            fontSize: 14,
            fontWeight: 'bold',
        },
        dailyLimitUpgradeButton: {
            alignSelf: 'center',
            minWidth: 140,
        },
        dailyLimitUpgradeButtonWrapper: {
            width: 'auto',
            alignItems: 'center',
            marginTop: 10,
        },
        unitCardWrapper: {
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
            backgroundColor: isDark ? colors.surface : '#fff',
        },
    });

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <LessonHeader
                    title={languageName as string}
                    languageName={languageName as string}
                    topPadding={0} // Let SafeAreaView handle the top padding
                />
                {/* Inline download progress UI instead of Modal */}
                {downloadProgress !== null && (
                    <View style={styles.modalView}>
                        <View style={styles.downloadProgressContainer}>
                            <Image 
                                source={require('@/assets/images/bunny-waiting.gif')} 
                                style={styles.bunnyImage}
                            />
                            <View style={styles.downloadProgressHeader}>
                                <ThemedText style={styles.downloadProgressTitle}>
                                    Getting things ready...
                                </ThemedText>
                                <ThemedText style={styles.downloadProgressCount}>
                                    {Math.round((downloadProgress.completed / downloadProgress.total) * 100)}%
                                </ThemedText>
                            </View>
                            <View style={styles.progressBarContainer}>
                                <View
                                    style={[
                                        styles.progressBar,
                                        { width: `${(downloadProgress.completed / downloadProgress.total) * 100}%` }
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                )}
                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : error ? (
                    <ThemedText>{error}</ThemedText>
                ) : (
                    <>
                        {units.length === 0 ? (
                            <ThemedText style={{ textAlign: 'center', fontSize: 18, marginTop: 40 }}>
                                📚✨ Lessons for this language are still being added. Please check back soon! 🚧
                            </ThemedText>
                        ) : (
                            <>
                                
                                <ScrollView
                                    ref={scrollViewRef}
                                    style={styles.scrollView}
                                    contentContainerStyle={{ paddingBottom: 32 }}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
                                >
                                    <ProgressCard completed={completedLessons} total={allLessons.length} level={currentLevel} />
                                    {units.map((unit) => {
                                        const unitLocked = isUnitLocked(unit.id);
                                        // Calculate progress for this unit
                                        const totalLessons = unit.lessons.length;
                                        const completedLessons = unit.lessons.filter(l => {
                                            const progress = getLessonProgress(l.id);
                                            return progress?.status === 'completed';
                                        }).length;
                                        const progressPercent = totalLessons > 0 ? completedLessons / totalLessons : 0;

                                        return (
                                            <View key={unit.id} style={[styles.unitContainer, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                                                <UnitCard unit={unit} />
                                                <View style={[styles.lessonsGrid, { backgroundColor: isDark ? colors.background : '#F8FAFC' }]}>
                                                    {unit.lessons.map((lesson) => {
                                                        const progress = getLessonProgress(lesson.id);
                                                        const lessonLocked = isLessonLocked(unit.id, lesson.id);
                                                        return (
                                                            <LessonCard
                                                                key={lesson.id}
                                                                lesson={lesson}
                                                                progress={progress}
                                                                locked={lessonLocked}
                                                                onPress={() => !lessonLocked && handleLessonPress(lesson)}
                                                            />
                                                        );
                                                    })}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </ScrollView>
                                <Animated.View
                                    style={[
                                        styles.scrollTopButton,
                                        { opacity: fadeAnim }
                                    ]}
                                >
                                    <Pressable
                                        onPress={scrollToTop}
                                        style={({ pressed }) => [
                                            styles.scrollTopPressable,
                                            pressed && styles.scrollTopPressed
                                        ]}
                                    >
                                        <ThemedText style={styles.scrollTopText}>↑</ThemedText>
                                    </Pressable>
                                </Animated.View>
                            </>
                        )}
                    </>
                )}
                <DailyLimitModal />
                {showPaywall && (
                    <Paywall
                        onSuccess={() => {
                            setShowPaywall(false);
                            setIsUpgradeLoading(false);
                            // Optionally refresh data after upgrade
                        }}
                        onClose={() => {
                            setShowPaywall(false);
                            setIsUpgradeLoading(false);
                        }}
                    />
                )}
            </View>
        </SafeAreaView>
    );
} 