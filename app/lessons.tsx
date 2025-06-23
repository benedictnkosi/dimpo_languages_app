import { Paywall } from '@/app/components/Paywall';
import { UpgradeToProButton } from '@/app/components/UpgradeToProButton';
import { LessonHeader } from '@/components/LessonHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
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
            console.log('[App] Screen focused - fetching latest learner data');
            fetchLearner();
        }, [fetchLearner])
    );

    // Function to determine if a unit is locked
    const isUnitLocked = (unitId: number): boolean => {
        console.log('[isUnitLocked] Checking unit:', unitId);
        const unit = units.find(u => u.id === unitId);
        if (!unit) {
            console.log('[isUnitLocked] Unit not found:', unitId);
            return true;
        }

        const minOrder = Math.min(...units.map(u => u.unitOrder));
        if (unit.unitOrder === minOrder) {
            console.log('[isUnitLocked] This is the first unit, always unlocked:', unitId);
            return false;
        }

        const prevUnit = units.find(u => u.unitOrder === unit.unitOrder - 1);
        if (!prevUnit) {
            console.log('[isUnitLocked] Previous unit not found for unit:', unitId);
            return true;
        }

        const allPrevCompleted = prevUnit.lessons.every(lesson => {
            const progress = learnerProgress.find(p => p.lessonId === lesson.id);
            console.log('[isUnitLocked] Previous unit lesson', lesson.id, 'progress:', progress?.status);
            return progress?.status === 'completed';
        });
        console.log('[isUnitLocked] All previous unit lessons completed:', allPrevCompleted, 'for unit:', unitId);

        return !allPrevCompleted;
    };

    // Function to determine if a lesson is locked
    const isLessonLocked = (unitId: number, lessonId: number): boolean => {
        console.log('[isLessonLocked] Checking lesson:', lessonId, 'in unit:', unitId);
        
        // Check for free member restrictions - lock unit 3 lesson 2 and onwards
        if (learner?.subscription === 'free') {
            const unit = units.find(u => u.id === unitId);
            if (unit && unit.unitOrder >= 3) {
                const lesson = unit.lessons.find(l => l.id === lessonId);
                if (lesson && lesson.lessonOrder >= 2) {
                    console.log('[isLessonLocked] Free user - locking unit 3 lesson 2 and onwards:', unitId, lessonId);
                    return true;
                }
            }

            // Check daily lesson limit for free users
            const today = getTodayString();
            if (dailyLessonCount.date === today && dailyLessonCount.count >= 3) {
                console.log('[isLessonLocked] Free user - daily lesson limit reached:', dailyLessonCount.count);
                return true;
            }
        }
        
        // If the unit is locked, all its lessons are locked
        const unitLocked = isUnitLocked(unitId);
        console.log('[isLessonLocked] Unit locked:', unitLocked);
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
            console.log('[isLessonLocked] No progress, lowestOrderUnit:', lowestOrderUnit.id, 'lowestOrderLesson:', lowestOrderLesson.id, 'locked:', locked);
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
        console.log('[isLessonLocked] highestLessonOrder:', highestLessonOrder);

        // Find the current lesson's order
        const currentLesson = unitLessons.find(l => l.id === lessonId);
        const currentLessonOrder = currentLesson?.lessonOrder || 0;
        console.log('[isLessonLocked] currentLessonOrder:', currentLessonOrder);

        // If the previous lesson is completed, unlock this lesson
        const previousLesson = unitLessons.find(l => l.lessonOrder === currentLessonOrder - 1);
        if (previousLesson) {
            const previousLessonProgress = learnerProgress.find(p => p.lessonId === previousLesson.id);
            console.log('[isLessonLocked] previousLesson:', previousLesson.id, 'progress:', previousLessonProgress?.status);
            if (previousLessonProgress?.status === 'completed') {
                return false;
            }
        }

        // If no progress in this unit, unlock the first lesson
        if (highestLessonOrder === -Infinity) {
            const minOrder = Math.min(...unitLessons.map(l => l.lessonOrder));
            const unlocked = currentLessonOrder === minOrder;
            console.log('[isLessonLocked] No progress in unit, unlock first lesson:', unlocked);
            return !unlocked;
        }

        // Lock if this lesson's order is higher than the highest started/completed lesson
        const locked = currentLessonOrder > highestLessonOrder;
        console.log('[isLessonLocked] locked:', locked);
        return locked;
    };

    // Function to download a single resource
    const downloadResource = async (resourceName: string, type: 'audio' | 'image'): Promise<void> => {
        if (downloadedResources.has(resourceName)) {
            console.log(`[Resource] Skipping ${type} ${resourceName} - already downloaded`);
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
                console.log(`[Resource] ${type} ${resourceName} already exists on disk`);
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

        console.log(`[Resource] Starting download of ${type} ${resourceName}`);
        console.log(`[Resource] From: ${endpoint}`);
        console.log(`[Resource] To: ${fileUri}`);

        try {
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
                console.log(`[Resource] Successfully downloaded ${type} ${resourceName}`);
                console.log(`[Resource] File size: ${downloadResult.headers['content-length'] || 'unknown'} bytes`);
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
            console.log(`[Unit ${unitId}] Starting resource download process`);

            // Fetch resource list
            const response = await fetch(`${HOST_URL}/api/unit-resources/${unitId}/${languageCode}`);
            if (!response.ok) {
                console.error(`[Unit ${unitId}] Failed to fetch resource list - Status: ${response.status}`);
                throw new Error('Failed to fetch resource list');
            }

            const resources: UnitResources = await response.json();
            const totalResources = resources.audio.length + resources.images.length;

            console.log(`[Unit ${unitId}] Found resources:`, {
                audioCount: resources.audio.length,
                imageCount: resources.images.length
            });

            // Initialize download progress
            setDownloadProgress({
                total: totalResources,
                completed: 0
            });

            // Create directories if they don't exist
            console.log(`[Unit ${unitId}] Creating resource directories`);
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}audio`, { intermediates: true });
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}image`, { intermediates: true });

            // Download all resources
            console.log(`[Unit ${unitId}] Starting parallel download of all resources`);
            const downloadPromises = [
                ...resources.audio.map(audio => downloadResource(audio, 'audio')),
                ...resources.images.map(image => downloadResource(image, 'image'))
            ];

            await Promise.all(downloadPromises);
            setDownloadProgress(null);
            console.log(`[Unit ${unitId}] Successfully completed all resource downloads`);
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
                console.log(`[App] Fetched progress for ${progress.length} lessons`);
                console.log('progress data', progress);
                setLearnerProgress(progress);
                return progress;
            } else if (progressResponse.status !== 404) {
                throw new Error('Failed to fetch progress');
            } else {
                console.log('[App] No progress found for this language');
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
            console.log('[App] Screen focused - fetching latest progress');
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
                const { user } = JSON.parse(authData);

                console.log('[App] Starting data fetch process');
                console.log(`[App] Language: ${languageCode}`);

                // Fetch lessons first
                const lessonsResponse = await fetch(`${HOST_URL}/api/lessons?language=${languageCode}`);
                if (!lessonsResponse.ok) {
                    throw new Error('Failed to fetch lessons');
                }
                const lessons: Lesson[] = await lessonsResponse.json();
                console.log(`[App] Fetched ${lessons.length} lessons`);

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
                console.log(`[App] Organized lessons into ${sortedUnits.length} units`);

                // Sort lessons within each unit
                sortedUnits.forEach(unit => {
                    unit.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
                });

                setUnits(sortedUnits);

                // Download resources for started units or the lowest order unit if no progress
                if (progress.length > 0) {
                    const startedUnits = new Set(progress
                        .filter((p: LessonProgress) => p.status === 'started')
                        .map((p: LessonProgress) => p.unitId));

                    console.log(`[App] Found ${startedUnits.size} units with started lessons`);
                    for (const unitId of startedUnits) {
                        await downloadUnitResources(unitId);
                    }
                } else {
                    // If no progress, download resources for the lowest order unit
                    const lowestOrderUnit = sortedUnits[0];
                    if (lowestOrderUnit) {
                        console.log(`[App] No progress found - downloading resources for lowest order unit: ${lowestOrderUnit.id}`);
                        await downloadUnitResources(lowestOrderUnit.id);
                    }
                }
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
            console.log(`[Unit ${unitId}] Starting resource cleanup`);

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
                    console.log(`[Unit ${unitId}] Deleted audio file: ${audioFile}`);
                } catch (error) {
                    console.error(`[Unit ${unitId}] Error deleting audio file ${audioFile}:`, error);
                }
            }

            // Delete image files
            for (const imageFile of resources.images) {
                const fileUri = `${FileSystem.documentDirectory}image/${imageFile}`;
                try {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                    console.log(`[Unit ${unitId}] Deleted image file: ${imageFile}`);
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

            console.log(`[Unit ${unitId}] Resource cleanup completed`);
        } catch (error) {
            console.error(`[Unit ${unitId}] Error in resource cleanup:`, error);
        }
    };

    // Modify handleLessonPress to handle unit changes
    const handleLessonPress = async (lesson: Lesson) => {
        // Check daily lesson limit for free users
        if (learner?.subscription === 'free') {
            const { canTakeLesson } = await checkDailyLessonLimit();
            if (!canTakeLesson) {
                console.log('[App] Free user - daily lesson limit reached');
                setShowDailyLimitModal(true);
                return;
            }
        }

        // Check if we're switching units
        if (currentUnit && currentUnit.id !== lesson.unitId) {
            console.log(`[App] Switching from unit ${currentUnit.id} to unit ${lesson.unitId}`);

            // Delete resources from the old unit
            await deleteUnitResources(currentUnit.id);

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
        if (!downloadedResources.size) {
            console.log('[App] Downloading resources for new unit');
            try {
                await downloadUnitResources(lesson.unitId);
            } catch (error) {
                console.error('[App] Error downloading resources for new unit:', error);
                // Continue with navigation even if download fails
            }
        }

        // Increment daily lesson count for free users
        await incrementDailyLessonCount();

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
            console.log('[App] Updated learner progress:', updatedProgress);

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

        console.log('[App] Navigating to lesson:', lesson.title);

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
                        <View style={styles.dailyLimitUpgradeButtonWrapper}>
                            <UpgradeToProButton
                                style={styles.dailyLimitUpgradeButton}
                                onPress={() => setShowPaywall(true)}
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
                        {isPremiumLocked && (
                            <View style={styles.premiumBadge}>
                                <Ionicons name="star" size={12} color="#FCD34D" />
                                <ThemedText style={styles.premiumBadgeText}>Premium</ThemedText>
                            </View>
                        )}
                    </View>
                    {unit.description && (
                        <ThemedText style={styles.unitCardDescription}>{unit.description}</ThemedText>
                    )}
                    <ThemedText style={styles.unitCardLessonCount}>
                        {unit.lessons.length} lessons
                    </ThemedText>
                </View>
            </LinearGradient>
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
                            <Pressable
                                style={[styles.dailyLimitButton, styles.dailyLimitButtonSecondary]}
                                onPress={() => setShowDailyLimitModal(false)}
                            >
                                <ThemedText style={styles.dailyLimitButtonTextSecondary}>
                                    Maybe Later
                                </ThemedText>
                            </Pressable>
                            <UpgradeToProButton
                                style={{ flex: 1, marginLeft: 12 }}
                                onPress={() => {
                                    setShowDailyLimitModal(false);
                                    setShowPaywall(true);
                                }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }

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
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 2,
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
            marginHorizontal: 8,
            borderWidth: 1,
            borderColor: '#FCD34D',

        },
        premiumBadgeText: {
            color: '#FCD34D',
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
    });

    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <ThemedView style={styles.container}>
                <LessonHeader
                    title={languageName as string}
                    languageName={languageName as string}
                    topPadding={0} // Let SafeAreaView handle the top padding
                />
                {/* Inline download progress UI instead of Modal */}
                {downloadProgress !== null && (
                    <View style={styles.modalView}>
                        <ThemedView style={styles.downloadProgressContainer}>
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
                        </ThemedView>
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
                                <ProgressCard completed={completedLessons} total={allLessons.length} level={currentLevel} />
                                <ScrollView
                                    ref={scrollViewRef}
                                    style={styles.scrollView}
                                    contentContainerStyle={{ paddingBottom: 32 }}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
                                >
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
                                            <ThemedView key={unit.id} style={styles.unitContainer}>
                                                <UnitCard unit={unit} />
                                                <ThemedView style={styles.lessonsGrid}>
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
                                                </ThemedView>
                                            </ThemedView>
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
                            // Optionally refresh data after upgrade
                        }}
                        onClose={() => setShowPaywall(false)}
                    />
                )}
            </ThemedView>
        </SafeAreaView>
    );
} 