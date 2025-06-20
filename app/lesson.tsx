import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { LessonHeader } from '@/components/LessonHeader';
import { SelectImageQuestion } from './components/SelectImageQuestion';
import { MatchPairsQuestion } from './components/MatchPairsQuestion';
import { TranslateQuestion } from './components/TranslateQuestion';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { TapWhatYouHearQuestion } from './components/TapWhatYouHearQuestion';
import { FillInBlankQuestion } from './components/FillInBlankQuestion';
import { TypeWhatYouHearQuestion } from './components/TypeWhatYouHearQuestion';
import { CompleteTranslationQuestion } from './components/CompleteTranslationQuestion';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { FeedbackMessage, FeedbackButton } from './components/CheckContinueButton';
import { useFeedback } from './contexts/FeedbackContext';
import { useTheme } from '@/contexts/ThemeContext';
import { InteractionManager } from 'react-native';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface Question {
    id: number;
    words?: Word[];
    options: string[];
    correctOption: number | null;
    questionOrder: number;
    type: 'select_image' | 'tap_what_you_hear' | 'match_pairs' | 'type_what_you_hear' | 'fill_in_blank' | 'complete_translation' | 'translate';
    blankIndex: number | null;
    sentenceWords: string[] | null;
    direction: string | null;
    matchType?: 'audio' | 'text';
}

interface IncorrectQuestion {
    question: Question;
    questionId: string | number;
}

// Helper to check if resources are downloaded for a unit/language
async function areResourcesDownloaded(unitId: number, languageCode: string): Promise<boolean> {
    const key = `unit_${unitId}_${languageCode}_resources`;
    const downloaded = await SecureStore.getItemAsync(key);
    if (downloaded === 'true') {
        // Optionally, check if files exist in the directory
        return true;
    }
    return false;
}

function LessonContent() {
    const { lessonId, lessonTitle, languageCode, unitName, lessonNumber } = useLocalSearchParams();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [areResourcesDownloadedState, setAreResourcesDownloadedState] = useState(false);
    const { isChecked, isCorrect, questionId } = useFeedback();
    const checkRef = useRef<() => void>(() => { });
    const continueRef = useRef<() => void>(() => { });
    const scrollViewRef = useRef<ScrollView>(null);
    const [incorrectQuestions, setIncorrectQuestions] = useState<IncorrectQuestion[]>([]);
    const [showReview, setShowReview] = useState(false);
    const [isRetryingIncorrect, setIsRetryingIncorrect] = useState(false);
    const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showQuitModal, setShowQuitModal] = useState(false);
    const [correctStreak, setCorrectStreak] = useState(0);
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const [isQuestionAnswered, setIsQuestionAnswered] = useState(false);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
        },
        content: {
            flex: 1,
        },
        scrollView: {
            flex: 1,
        },
        progressContainer: {
            padding: 16,
            gap: 8,
        },
        progressBackground: {
            height: 8,
            backgroundColor: isDark ? colors.surfaceHigh : '#E5E7EB',
            borderRadius: 4,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            backgroundColor: colors.primary,
            borderRadius: 4,
        },
        progressText: {
            fontSize: 14,
            textAlign: 'center',
            opacity: 0.8,
            color: colors.text,
        },
        questionContainer: {
            padding: 16,
            gap: 16,
        },
        questionTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            color: colors.text,
        },
        optionsContainer: {
            gap: 12,
        },
        optionButton: {
            backgroundColor: isDark ? colors.surfaceHigh : colors.primary,
            padding: 16,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        optionButtonPressed: {
            opacity: 0.8,
            transform: [{ scale: 0.98 }],
        },
        checkButton: {
            margin: 16,
            padding: 12,
            backgroundColor: isDark ? colors.surfaceHigh : '#E5E7EB',
            borderRadius: 8,
            alignItems: 'center',
        },
        checkButtonSelected: {
            backgroundColor: colors.success,
        },
        checkButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        checkButtonTextSelected: {
            color: colors.buttonText,
        },
        feedbackContainer: {
            padding: 16,
            backgroundColor: isDark ? colors.surface : '#fff',
            borderTopWidth: 1,
            borderTopColor: isDark ? colors.border : '#E5E7EB',
            zIndex: 10,
            alignItems: 'center',
            width: '100%',
            flexDirection: 'column',
            gap: 12,
        },
        correctFeedback: {
            color: colors.success,
            fontWeight: 'bold',
            fontSize: 20,
        },
        correctLabel: {
            color: colors.success,
            fontWeight: '600',
            fontSize: 18,
            marginLeft: 8,
            textDecorationLine: 'underline',
        },
        reviewContainer: {
            flex: 1,
            padding: 16,
        },
        reviewTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 16,
            textAlign: 'center',
            color: colors.text,
        },
        reviewScrollView: {
            flex: 1,
        },
        reviewItem: {
            backgroundColor: isDark ? colors.surface : '#fff',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        reviewQuestionNumber: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 8,
            color: colors.text,
        },
        reviewQuestionType: {
            fontSize: 16,
            color: colors.textSecondary,
            marginBottom: 8,
        },
        reviewAnswer: {
            fontSize: 16,
            color: colors.error,
            marginBottom: 4,
        },
        reviewCorrectAnswer: {
            fontSize: 16,
            color: colors.success,
        },
        retryButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            marginTop: 16,
            alignItems: 'center',
        },
        retryButtonText: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.buttonText,
        },
        letsGoButton: {
            backgroundColor: colors.primary,
            padding: 16,
            borderRadius: 12,
            marginTop: 32,
            alignItems: 'center',
        },
        letsGoButtonText: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.buttonText,
        },
        celebrationContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
        },
        celebrationTitle: {
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.success,
            marginBottom: 16,
            textAlign: 'center',
        },
        celebrationSubtitle: {
            fontSize: 20,
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        celebrationPoints: {
            fontSize: 24,
            color: colors.primary,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 32,
            textAlign: 'center',
        },
        continueButton: {
            backgroundColor: colors.primary,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 3,
        },
        continueButtonPressed: {
            opacity: 0.9,
            transform: [{ scale: 0.98 }],
        },
        continueButtonText: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.buttonText,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: colors.backdrop,
            justifyContent: 'center',
            alignItems: 'center',
        },
        modalContent: {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
            alignItems: 'center',
        },
        modalTitle: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 16,
            color: colors.text,
        },
        modalText: {
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 24,
            color: colors.textSecondary,
            lineHeight: 24,
        },
        modalButtons: {
            flexDirection: 'row',
            gap: 12,
            width: '100%',
        },
        modalButton: {
            flex: 1,
            padding: 16,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: {
            backgroundColor: isDark ? colors.surfaceHigh : '#F1F5F9',
        },
        quitButton: {
            backgroundColor: colors.error,
        },
        cancelButtonText: {
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
        },
        quitButtonText: {
            color: colors.buttonText,
            fontSize: 16,
            fontWeight: '600',
        },
        streakCelebrationContainer: {
            backgroundColor: isDark ? colors.surface : '#FFFFFF',
            borderRadius: 20,
            padding: 32,
            width: '90%',
            maxWidth: 400,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.3,
            shadowRadius: 4.65,
            elevation: 8,
        },
        streakTitle: {
            fontSize: 32,
            fontWeight: 'bold',
            color: colors.accent,
            marginBottom: 16,
            textAlign: 'center',
        },
        streakSubtitle: {
            fontSize: 24,
            color: colors.text,
            marginBottom: 12,
            textAlign: 'center',
        },
        streakPoints: {
            fontSize: 28,
            color: colors.accent,
            fontWeight: '700',
            marginTop: 16,
            marginBottom: 32,
            textAlign: 'center',
        },
        errorContainer: {
            margin: 24,
            padding: 20,
            backgroundColor: isDark ? '#2D2A2E' : '#FEE2E2',
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
        },
        errorText: {
            color: colors.error,
            fontSize: 18,
            textAlign: 'center',
            fontWeight: '600',
        },
    });

    function ReviewSection({ onRetry }: { onRetry: () => void }) {
        return (
            <ThemedView style={styles.reviewContainer}>
                <ThemedText style={styles.reviewTitle}>Let's retry the questions you got wrong.</ThemedText>
                <Pressable style={styles.letsGoButton} onPress={onRetry} accessibilityRole="button">
                    <ThemedText style={styles.letsGoButtonText}>Let's go 🚀</ThemedText>
                </Pressable>
            </ThemedView>
        );
    }

    // Function to increment points
    const incrementPoints = async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                console.error('No auth data found');
                return;
            }
            const { user } = JSON.parse(authData);
            console.log('User:', user.uid);
            const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/increment-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    points: 10,
                    lessonId: Number(lessonId)
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to increment points');
            }

            const data = await response.json();
            console.log('Points incremented:', data);
        } catch (error) {
            console.error('Error incrementing points:', error);
        }
    };

    // Function to update lesson progress
    const updateLessonProgress = async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                console.error('No auth data found');
                return;
            }
            const { user } = JSON.parse(authData);
            const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: Number(lessonId),
                    language: languageCode,
                    status: 'completed'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update lesson progress');
            }

            const data = await response.json();
            console.log('Lesson progress updated:', data);
        } catch (error) {
            console.error('Error updating lesson progress:', error);
        }
    };

    // Effect to track incorrect questions using feedback context
    useEffect(() => {
        if (isChecked && !isCorrect && questionId && questions[currentQuestionIndex]) {
            setIncorrectQuestions(prev => [...prev, {
                question: questions[currentQuestionIndex],
                questionId
            }]);
        }
    }, [isChecked, isCorrect, questionId, currentQuestionIndex, questions]);

    // Effect to show review section when all questions are completed
    useEffect(() => {
        if (currentQuestionIndex >= questions.length && questions.length > 0) {
            setShowReview(true);
        }
    }, [currentQuestionIndex, questions.length]);

    useEffect(() => {
        if (showReview) {
            console.log('Questions the user got wrong:', incorrectQuestions);
        }
    }, [showReview, incorrectQuestions]);

    useEffect(() => {
        async function fetchQuestions() {
            try {
                const response = await fetch(`${HOST_URL}/api/language-questions/lesson/${lessonId}/language/${languageCode}`);
                const data = await response.json();
                // Sort questions by questionOrder
                const sortedQuestions = data.sort((a: Question, b: Question) => a.questionOrder - b.questionOrder);
                setQuestions(sortedQuestions);
                setOriginalQuestions(sortedQuestions);
                // Check for resources for the first question's unitId
                if (sortedQuestions.length > 0 && sortedQuestions[0].words && sortedQuestions[0].words.length > 0) {
                    const unitId = sortedQuestions[0].words[0].unitId || null;
                    if (unitId && languageCode) {
                        const downloaded = await areResourcesDownloaded(unitId, languageCode as string);
                        setAreResourcesDownloadedState(downloaded);
                    }
                }
            } catch (err) {
                setError("Sorry, we couldn't load your lesson questions. Please check your internet connection or try again shortly.");
            } finally {
                setIsLoading(false);
            }
        }
        fetchQuestions();
    }, [lessonId, languageCode]);

    const handleRetry = () => {
        setShowReview(false);
        setIsRetryingIncorrect(true);
        setCurrentQuestionIndex(0);
        setQuestions(incorrectQuestions.map(q => q.question));
        setIncorrectQuestions([]);
    };

    // When retrying is done, reset to original questions and exit retry mode
    useEffect(() => {
        if (isRetryingIncorrect && currentQuestionIndex >= questions.length && questions.length > 0) {
            if (incorrectQuestions.length === 0) {
                setShowCelebration(true);
                setShowReview(false);
            } else {
                setShowReview(true);
            }
            setIsRetryingIncorrect(false);
            setQuestions(originalQuestions);
            setCurrentQuestionIndex(0);
        }
    }, [isRetryingIncorrect, currentQuestionIndex, questions.length, originalQuestions, incorrectQuestions.length]);

    // Also handle the case when the user finishes the lesson the first time with no incorrect questions
    useEffect(() => {
        if (!isRetryingIncorrect && showReview && incorrectQuestions.length === 0) {
            setShowCelebration(true);
            setShowReview(false);
        }
    }, [showReview, incorrectQuestions.length, isRetryingIncorrect]);

    // Effect to track correct streak
    useEffect(() => {
        if (isChecked && isCorrect) {
            setCorrectStreak(prev => {
                const newStreak = prev + 1;
                if (newStreak === 10) {
                    setShowStreakCelebration(true);
                }
                return newStreak;
            });
        } else if (isChecked && !isCorrect) {
            setCorrectStreak(0);
        }
    }, [isChecked, isCorrect]);

    const handleCheck = () => checkRef.current();
    const handleContinue = () => {
        continueRef.current?.(); // Reset child state
        setCurrentQuestionIndex(idx => idx + 1); // Move to next question
        setIsQuestionAnswered(false); // Reset isQuestionAnswered for the next question
    };

    const handleQuit = () => {
        setShowQuitModal(true);
    };

    const confirmQuit = () => {
        setShowQuitModal(false);
        router.back();
    };

    const cancelQuit = () => {
        setShowQuitModal(false);
    };

    const renderProgressBar = () => {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>

            </View>
        );
    };

    const renderQuestion = (question: Question) => {
        if (!question) return null;

        switch (question.type) {
            case 'select_image':
                return (
                    <SelectImageQuestion
                        words={question.words || []}
                        options={question.options}
                        correctOption={question.correctOption}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'tap_what_you_hear':
                return (
                    <TapWhatYouHearQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'match_pairs':
                return (
                    <MatchPairsQuestion
                        words={question.words || []}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        onCheck={handleContinue}
                        matchType={question.matchType}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'type_what_you_hear':
                return (
                    <TypeWhatYouHearQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'fill_in_blank':
                return (
                    <FillInBlankQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        blankIndex={question.blankIndex ?? 0}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'complete_translation':
                return (
                    <CompleteTranslationQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        blankIndex={question.blankIndex ?? 0}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            case 'translate':
                return (
                    <TranslateQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        direction={question.direction as 'from_english' | 'to_english'}
                        sentenceWords={question.sentenceWords}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                        setIsQuestionAnswered={setIsQuestionAnswered}
                    />
                );

            default:
                return null;
        }
    };

    // Streak Celebration Component
    function StreakCelebration() {
        const [scale] = useState(new Animated.Value(0));
        const [rotation] = useState(new Animated.Value(0));

        useEffect(() => {
            // Award bonus points when streak celebration is shown
            const awardStreakPoints = async () => {
                try {
                    const authData = await SecureStore.getItemAsync('auth');
                    if (!authData) {
                        console.error('No auth data found');
                        return;
                    }
                    const { user } = JSON.parse(authData);
                    const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/increment-points`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            points: 5, // Bonus points for streak
                            lessonId: Number(lessonId),
                            streak: true // Flag to indicate this is a streak bonus
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to increment streak points');
                    }

                    const data = await response.json();
                    console.log('Streak bonus points awarded:', data);
                } catch (error) {
                    console.error('Error awarding streak points:', error);
                }
            };

            if (showStreakCelebration) {
                awardStreakPoints();
            }

            Animated.parallel([
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.sequence([
                    Animated.timing(rotation, {
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rotation, {
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }, [showStreakCelebration]);

        const handleContinue = () => {
            setShowStreakCelebration(false);
        };

        const spin = rotation.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '360deg'],
        });

        return (
            <Modal
                visible={showStreakCelebration}
                transparent
                animationType="fade"
                onRequestClose={handleContinue}
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        style={[
                            styles.streakCelebrationContainer,
                            {
                                transform: [
                                    { scale },
                                    { rotate: spin },
                                ],
                            },
                        ]}
                    >
                        <ThemedText style={styles.streakTitle}>🔥 10 IN A ROW! 🔥</ThemedText>
                        <ThemedText style={styles.streakSubtitle}>You're on fire!</ThemedText>
                        <ThemedText style={styles.streakPoints}>+5 bonus points</ThemedText>
                        <Pressable
                            style={({ pressed }) => [
                                styles.continueButton,
                                pressed && styles.continueButtonPressed
                            ]}
                            onPress={handleContinue}
                            accessibilityRole="button"
                        >
                            <ThemedText style={styles.continueButtonText}>Keep Going!</ThemedText>
                        </Pressable>
                    </Animated.View>
                </View>
            </Modal>
        );
    }

    // CelebrationScreen moved inside LessonContent to access incrementPoints
    function CelebrationScreen() {
        useEffect(() => {
            // Increment points and update lesson progress when the celebration screen is shown
            incrementPoints();
            updateLessonProgress();
        }, []);

        const handleContinue = () => {
            router.back();
        };

        return (
            <ThemedView style={styles.celebrationContainer}>
                <ThemedText style={styles.celebrationTitle}>🎉 Congratulations! 🎉</ThemedText>
                <ThemedText style={styles.celebrationSubtitle}>You've completed the lesson!</ThemedText>
                <ThemedText style={styles.celebrationPoints}>+10 points</ThemedText>
                <Pressable
                    style={({ pressed }) => [
                        styles.continueButton,
                        pressed && styles.continueButtonPressed
                    ]}
                    onPress={handleContinue}
                    accessibilityRole="button"
                >
                    <ThemedText style={styles.continueButtonText}>Continue Learning</ThemedText>
                </Pressable>
            </ThemedView>
        );
    }

    // Add effect to scroll to top when question changes
    useEffect(() => {
        InteractionManager.runAfterInteractions(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
    }, [currentQuestionIndex]);

    return (
        <ThemedView style={styles.container}>
            <LessonHeader
                title={unitName as string}
                subText={lessonTitle as string}
                showBackButton={true}
                onBackPress={handleQuit}
                topPadding={0}
            />
            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <View style={styles.errorContainer}>
                    <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
            ) : showCelebration ? (
                <CelebrationScreen />
            ) : showReview ? (
                <ReviewSection
                    onRetry={handleRetry}
                />
            ) : questions.length > 0 && currentQuestionIndex < questions.length ? (
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
                >
                    <View style={styles.progressContainer}>
                        {renderProgressBar()}
                    </View>
                    <View style={styles.questionContainer}>
                        {renderQuestion(questions[currentQuestionIndex])}
                    </View>
                </ScrollView>
            ) : (
                <ThemedText>No questions available</ThemedText>
            )}
            {!showReview && !showCelebration && questions.length > 0 && currentQuestionIndex < questions.length && (
                <SafeAreaView edges={['bottom']} style={styles.feedbackContainer}>
                    <FeedbackMessage onContinue={handleContinue} />
                    <FeedbackButton
                        isDisabled={!isQuestionAnswered}
                        onCheck={handleCheck}
                        onContinue={handleContinue}
                    />
                </SafeAreaView>
            )}
            <StreakCelebration />
            <Modal
                visible={showQuitModal}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelQuit}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Quit Lesson?</ThemedText>
                        <ThemedText style={styles.modalText}>
                            Are you sure you want to quit this lesson? Your progress will be saved.
                        </ThemedText>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={cancelQuit}
                            >
                                <ThemedText style={styles.cancelButtonText}>Continue Learning</ThemedText>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.quitButton]}
                                onPress={confirmQuit}
                            >
                                <ThemedText style={styles.quitButtonText}>Quit Lesson</ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

export default function LessonScreen() {
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <FeedbackProvider>
                <LessonContent />
            </FeedbackProvider>
        </SafeAreaView>
    );
} 