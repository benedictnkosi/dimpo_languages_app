import { ThemedText } from '@/components/ThemedText';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSound } from '../contexts/SoundContext';

interface FeedbackButtonProps {
    isDisabled: boolean;
    onCheck: () => void;
    onContinue: () => void;
}

export function FeedbackMessage({ onContinue }: { onContinue: () => void }) {
    const { isChecked, isCorrect, feedbackText, correctAnswer, questionId } = useFeedback();
    const { colors, isDark } = useTheme();
    const feedbackColor = isChecked && !isCorrect ? '#EF4444' : '#10B981';
    const [isReporting, setIsReporting] = React.useState(false);
    const [reportStatus, setReportStatus] = React.useState<string | null>(null);

    if (!isChecked) return null;

    async function handleReport() {
        setIsReporting(true);
        setReportStatus(null);
        try {
            const url = `${HOST_URL}/api/language-questions/${questionId}/report`;
            console.log('Reporting question', url);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (res.ok) {
                setReportStatus('Reported!');
                onContinue();
            } else {
                setReportStatus('Failed to report');
            }
        } catch (e) {
            setReportStatus('Failed to report');
        } finally {
            setIsReporting(false);
            setTimeout(() => setReportStatus(null), 2000);
        }
    }

    return (
        <View style={styles.feedbackContainerRow}>
            <View style={styles.feedbackContainerText}>
                <ThemedText style={[styles.feedbackText, { color: isChecked && !isCorrect ? colors.error : colors.success }]}>
                    {feedbackText || (isCorrect ? '✅ Correct!' : '❌ That\'s not quite right')}
                </ThemedText>
                {!isCorrect && correctAnswer && (
                    <ThemedText style={[styles.correctAnswerText, { color: colors.error }]}>
                        💡 Correct answer: {correctAnswer}
                    </ThemedText>
                )}
                {reportStatus && (
                    <ThemedText style={[styles.reportStatus, { color: colors.success }]}>{reportStatus}</ThemedText>
                )}
            </View>
            <Pressable
                onPress={handleReport}
                disabled={isReporting}
                accessibilityLabel="Flag this question"
                style={styles.flagButton}
            >
                <ThemedText style={{ fontSize: 22, marginLeft: 8 }}>🚩</ThemedText>
            </Pressable>
        </View>
    );
}

export function FeedbackButton({ isDisabled, onCheck, onContinue }: FeedbackButtonProps) {
    const { isChecked, isCorrect } = useFeedback();
    const { width } = useWindowDimensions();
    const scale = React.useRef(new Animated.Value(1)).current;
    const insets = useSafeAreaInsets();
    const soundRef = React.useRef<Audio.Sound | null>(null);
    const latestFeedbackRef = React.useRef({ isCorrect });
    const { colors, isDark } = useTheme();
    const { soundEnabled } = useSound();

    // Update ref when feedback changes
    React.useEffect(() => {
        latestFeedbackRef.current = { isCorrect };
    }, [isCorrect]);

    // Play feedback sound
    async function playFeedbackSound(type: 'correct' | 'wrong') {
        // Only play sound if sound is enabled
        if (!soundEnabled) return;
        
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            const soundObject = new Audio.Sound();
            const source =
                type === 'correct'
                    ? require('../../assets/audio/correct.mp3')
                    : require('../../assets/audio/wrong.mp3');
            await soundObject.loadAsync(source);
            await soundObject.playAsync();
            soundRef.current = soundObject;
            // Unload after playback
            soundObject.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    soundObject.unloadAsync();
                    soundRef.current = null;
                }
            });
        } catch (e) {
            // fail silently
        }
    }

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const handleCheck = async () => {
        await onCheck();
        // Wait for the feedback context to update
        setTimeout(() => {
            playFeedbackSound(latestFeedbackRef.current.isCorrect ? 'correct' : 'wrong');
        }, 100);
    };

    let buttonText = 'Check';
    let buttonStyle = { ...styles.button, backgroundColor: 'transparent' };
    let buttonTextStyle = { ...styles.buttonText, color: colors.buttonText };
    let useGradient = false;

    console.log('isDisabled', isDisabled);
    console.log('isChecked', isChecked);
    console.log('isCorrect', isCorrect);

    if (isDisabled) {
        buttonStyle = {
            ...buttonStyle,
            backgroundColor: isDark ? colors.surfaceHigh : colors.surface,
            shadowColor: 'transparent',
            elevation: 0,
        };
        buttonTextStyle = { ...buttonTextStyle, color: isDark ? colors.textSecondary : '#9CA3AF' };
    } else if (isChecked && isCorrect) {
        buttonText = 'Continue';
        buttonStyle = { ...buttonStyle, ...styles.buttonChecked };
        buttonTextStyle = { ...buttonTextStyle, color: colors.buttonText };
        useGradient = true;
    } else if (isChecked && !isCorrect) {
        buttonText = 'Got it';
        buttonStyle = {
            ...buttonStyle,
            backgroundColor: colors.error,
        };
        buttonTextStyle = { ...buttonTextStyle, color: colors.buttonText };
    } else if (!isDisabled) {
        buttonStyle = { ...buttonStyle, ...styles.buttonEnabled };
        buttonTextStyle = { ...buttonTextStyle, color: colors.buttonText };
        useGradient = true;
    }

    React.useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    return (
        <View style={[styles.stickyButtonContainer, { width, paddingBottom: insets.bottom + 16 }]}>
            <Animated.View style={{ width: '100%', transform: [{ scale }] }}>
                {useGradient && !isDisabled ? (
                    <LinearGradient
                        colors={['#34d399', '#10b981']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={buttonStyle}
                    >
                        <Pressable
                            style={{ width: '100%', alignItems: 'center', justifyContent: 'center', height: '100%' }}
                            onPress={isChecked ? onContinue : handleCheck}
                            disabled={isDisabled}
                            onPressIn={handlePressIn}
                            onPressOut={handlePressOut}
                            android_ripple={{ color: '#059669' }}
                            accessibilityRole="button"
                        >
                            <ThemedText style={buttonTextStyle}>{buttonText}</ThemedText>
                        </Pressable>
                    </LinearGradient>
                ) : (
                    <Pressable
                        style={[
                            buttonStyle,
                            isDisabled && { borderColor: isDark ? colors.border : '#E5E7EB', borderWidth: 1 }
                        ]}
                        onPress={isChecked ? onContinue : handleCheck}
                        disabled={isDisabled}
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        accessibilityRole="button"
                    >
                        <ThemedText style={buttonTextStyle}>{buttonText}</ThemedText>
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    feedbackContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    feedbackContainerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 84,
        width: '100%',
    },
    feedbackContainerText: {
        flex: 1,
        alignItems: 'flex-start',
    },
    stickyButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    button: {
        width: '100%',
        minHeight: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#10b981',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 0,
        backgroundColor: 'transparent',
    },
    buttonEnabled: {},
    buttonChecked: {},
    buttonIncorrect: {
        backgroundColor: '#EF4444',
    },
    buttonDisabled: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
    },
    buttonText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    buttonTextEnabled: {
        color: '#fff',
    },
    buttonTextChecked: {
        color: '#fff',
    },
    buttonTextIncorrect: {
        color: '#fff',
    },
    buttonTextDisabled: {
        color: '#9CA3AF',
    },
    feedbackText: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'left',
        marginBottom: 4,
    },
    correctAnswerText: {
        fontSize: 16,
        textAlign: 'left',
        marginTop: 4,
        opacity: 0.9,
    },
    flagButton: {
        padding: 8,
        marginLeft: 8,
        alignSelf: 'flex-start',
    },
    reportStatus: {
        fontSize: 14,
        marginTop: 4,
    },
});

export default FeedbackButton; 