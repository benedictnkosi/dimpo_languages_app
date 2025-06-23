import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useFeedback } from '../contexts/FeedbackContext';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface MatchPairsQuestionProps {
    words: Word[];
    selectedLanguage: string;
    areResourcesDownloaded: boolean;
    matchType?: 'audio' | 'text';
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

function AudioButton({ isSelected }: { isSelected?: boolean }) {
    return (
        <View style={[styles.audioButton, isSelected && styles.audioButtonSelected]}>
            <View style={styles.audioIcon}>
                <Text style={{ color: isSelected ? '#22A9F5' : '#22A9F5', fontSize: 22 }}>🔊</Text>
            </View>
        </View>
    );
}

export function MatchPairsQuestion({
    words,
    selectedLanguage,
    areResourcesDownloaded,
    matchType = 'audio',
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: MatchPairsQuestionProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = (screenWidth - 48) / 2;
    const [selectedAudioId, setSelectedAudioId] = React.useState<number | null>(null);
    const [disabledLeftIds, setDisabledLeftIds] = React.useState<Set<number>>(new Set());
    const [disabledRightIds, setDisabledRightIds] = React.useState<Set<number>>(new Set());
    const [wrongTranslationId, setWrongTranslationId] = React.useState<number | null>(null);
    const [showFeedback, setShowFeedback] = React.useState(false);
    const [justMatchedId, setJustMatchedId] = React.useState<number | null>(null);
    const [audioUrlMap, setAudioUrlMap] = React.useState<Map<number, string>>(new Map());
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const { setFeedback, resetFeedback } = useFeedback();
    // Store a ref to the currently playing sound so we can stop/unload it
    const soundRef = React.useRef<Audio.Sound | null>(null);

    // Update audio URLs when words or language changes
    React.useEffect(() => {
        const newMap = new Map<number, string>();
        const promises = words.map(async word => {
            const audioFile = word.audio?.[selectedLanguage];
            if (audioFile) {
                const localUri = `${FileSystem.documentDirectory}audio/${audioFile}`;
                try {
                    const info = await FileSystem.getInfoAsync(localUri);
                    newMap.set(word.id, info.exists ? localUri : `${HOST_URL}/api/word/audio/get/${audioFile}`);
                } catch (error) {
                    newMap.set(word.id, `${HOST_URL}/api/word/audio/get/${audioFile}`);
                }
            }
        });

        Promise.all(promises).then(() => {
            setAudioUrlMap(newMap);
        });
    }, [words, selectedLanguage, areResourcesDownloaded]);

    // Shuffle array using Fisher-Yates algorithm
    const shuffledWords = React.useMemo(() => {
        const array = [...words];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }, [words]);

    console.log('matchType', matchType);

    // Play feedback sound
    async function playFeedbackSound(type: 'correct' | 'wrong') {
        try {
            const soundObject = new Audio.Sound();
            const source =
                type === 'correct'
                    ? require('../../assets/audio/correct.mp3')
                    : require('../../assets/audio/wrong.mp3');
            await soundObject.loadAsync(source);
            await soundObject.playAsync();
            // Unload after playback
            soundObject.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    soundObject.unloadAsync();
                }
            });
        } catch (e) {
            // fail silently
        }
    }

    const handleAudioCardPress = async (wordId: number) => {
        if (disabledLeftIds.has(wordId) || justMatchedId === wordId) return;

        // If the card is already selected, just return
        if (selectedAudioId === wordId) {
            return;
        }

        setSelectedAudioId(wordId);

        // Play the audio for this word
        const audioUrl = audioUrlMap.get(wordId);
        if (!audioUrl) return;
        try {
            // Stop and unload any previous sound
            if (soundRef.current) {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );
            soundRef.current = sound;
            // Unload when finished
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                    if (soundRef.current === sound) {
                        soundRef.current = null;
                    }
                }
            });
        } catch (error) {
            // fail silently
        }
    };

    const handleTranslationCardPress = (wordId: number) => {
        if (disabledRightIds.has(wordId) || justMatchedId === wordId || selectedAudioId === null) return;

        if (selectedAudioId === wordId) {
            setJustMatchedId(wordId);
            setSelectedAudioId(null);
            setTimeout(() => {
                setDisabledLeftIds(prev => {
                    const newSet = new Set([...prev, wordId]);
                    if (newSet.size + disabledRightIds.size + 1 === words.length * 2) {
                        setIsQuestionAnswered(true);
                    }
                    return newSet;
                });
                setDisabledRightIds(prev => {
                    const newSet = new Set([...prev, wordId]);
                    if (disabledLeftIds.size + newSet.size === words.length * 2) {
                        setIsQuestionAnswered(true);
                    }
                    return newSet;
                });
                setJustMatchedId(null);
                // Check if all pairs matched after both sets update
                if (
                    (disabledLeftIds.size + 1 === words.length) &&
                    (disabledRightIds.size + 1 === words.length)
                ) {
                    setIsQuestionAnswered(true);
                }
            }, 1000); // 1 second
        } else {
            setWrongTranslationId(wordId);
            setShowFeedback(true);
            setSelectedAudioId(null);
            playFeedbackSound('wrong');
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.delay(1000), // 1 second
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setWrongTranslationId(null);
                setShowFeedback(false);
            });
        }
    };

    const getCardStyle = (wordId: number, isAudio: boolean) => {
        const baseStyle = [
            styles.card,
            { width: cardWidth },
            isDark && styles.cardDark
        ];

        if (justMatchedId === wordId) {
            return [...baseStyle, isDark ? styles.justMatchedCardDark : styles.justMatchedCard];
        }

        if ((isAudio && disabledLeftIds.has(wordId)) || (!isAudio && disabledRightIds.has(wordId))) {
            return [...baseStyle, isDark ? styles.disabledCardDark : styles.disabledCard];
        }

        if (!isAudio && wrongTranslationId === wordId) {
            return [...baseStyle, isDark ? styles.wrongCardDark : styles.wrongCard];
        }

        if (isAudio && selectedAudioId === wordId) {
            return [...baseStyle, isDark ? styles.selectedCardDark : styles.selectedCard];
        }

        return baseStyle;
    };

    function handleCheck() {
        const allMatched = disabledLeftIds.size === words.length && disabledRightIds.size === words.length;
        setFeedback({
            isChecked: true,
            isCorrect: allMatched,
            feedbackText: allMatched ? 'All pairs matched!' : 'Some pairs are not matched yet.',
            correctAnswer: !allMatched ? words.map(w => w.translations['en']).join(', ') : undefined,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedAudioId(null);
        setDisabledLeftIds(new Set());
        setDisabledRightIds(new Set());
        setWrongTranslationId(null);
        setShowFeedback(false);
        setJustMatchedId(null);
    }

    React.useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={[styles.container, { backgroundColor: isDark ? '#181A20' : '#fff' }]}>
            <ThemedText style={styles.title} children="🔗 Let's do some matching!" />
            <View style={styles.pairRowHeader}>
                <View style={{ width: cardWidth }} />
                <View style={{ width: cardWidth }} />
            </View>
            <View style={styles.pairsGrid}>
                {words.map((word, idx) => {
                    const audioFile = word.audio?.[selectedLanguage];
                    const audioUrl = audioUrlMap.get(word.id);
                    const englishTranslation = word.translations['en'] || '';
                    const selectedLanguageWord = word.translations[selectedLanguage] || '';
                    const isJustMatched = justMatchedId === word.id;
                    const isLeftDisabled = disabledLeftIds.has(word.id) || isJustMatched;
                    const isRightDisabled = disabledRightIds.has(shuffledWords[idx].id) || isJustMatched;
                    const isSelected = selectedAudioId === word.id;

                    return (
                        <View style={styles.pairRow} key={word.id}>
                            <Pressable
                                style={getCardStyle(word.id, true)}
                                onPress={() => handleAudioCardPress(word.id)}
                                disabled={isLeftDisabled}
                            >
                                {matchType === 'audio' ? (
                                    <AudioButton isSelected={isSelected} />
                                ) : (
                                    <ThemedText style={[styles.translationText, isDark && styles.translationTextDark]} children={selectedLanguageWord} />
                                )}
                            </Pressable>
                            <Pressable
                                style={getCardStyle(shuffledWords[idx].id, false)}
                                onPress={() => handleTranslationCardPress(shuffledWords[idx].id)}
                                disabled={isRightDisabled}
                            >
                                <ThemedText style={[styles.translationText, isDark && styles.translationTextDark]} children={shuffledWords[idx].translations['en'] || ''} />
                            </Pressable>
                        </View>
                    );
                })}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    pairsGrid: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
    },
    pairRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        height: 80,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardDark: {
        backgroundColor: '#1F2937',
        borderColor: '#374151',
        shadowColor: '#000',
        shadowOpacity: 0.2,
    },
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    audioIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    translationText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        textAlign: 'center',
    },
    translationTextDark: {
        color: '#E5E7EB',
    },
    selectedCard: {
        borderColor: '#22A9F5',
        borderWidth: 2,
    },
    selectedCardDark: {
        borderColor: '#60A5FA',
        borderWidth: 2,
    },
    matchedCard: {
        borderColor: '#34D399',
        borderWidth: 2,
        backgroundColor: '#F0FDF4',
    },
    justMatchedCard: {
        borderColor: '#34D399',
        borderWidth: 2,
        backgroundColor: '#F0FDF4',
    },
    justMatchedCardDark: {
        borderColor: '#34D399',
        borderWidth: 2,
        backgroundColor: '#064E3B',
    },
    wrongCard: {
        borderColor: '#EF4444',
        borderWidth: 2,
        backgroundColor: '#FEF2F2',
    },
    wrongCardDark: {
        borderColor: '#EF4444',
        borderWidth: 2,
        backgroundColor: '#7F1D1D',
    },
    disabledCard: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        opacity: 0.6,
    },
    disabledCardDark: {
        backgroundColor: '#374151',
        borderColor: '#4B5563',
        opacity: 0.6,
    },
    checkButton: {
        backgroundColor: '#E5E7EB',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    checkButtonText: {
        color: '#bbb',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    pairRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    checkButtonActive: {
        backgroundColor: '#22A9F5',
    },
    checkButtonTextActive: {
        color: '#fff',
    },
    audioButtonSelected: {
        // Optionally add a subtle highlight if you want
        // backgroundColor: '#E0F2FE',
    },
    feedbackContainer: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
        alignSelf: 'stretch',
    },
    feedbackText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 0,
    },
    dismissButton: {
        backgroundColor: '#22A9F5',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    dismissButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
}); 