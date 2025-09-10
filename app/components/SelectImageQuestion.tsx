import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface SelectImageQuestionProps {
    words: Word[];
    options: string[];
    correctOption: number | null;
    onSelect?: (index: number) => void;
    selectedLanguage: string;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export function SelectImageQuestion({
    words,
    options = [],
    correctOption,
    selectedLanguage,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: SelectImageQuestionProps) {
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const { setFeedback, resetFeedback } = useFeedback();
    const scrollViewRef = useRef<ScrollView>(null);
    const { colors } = useTheme();
    const [autoPlayAudio, setAutoPlayAudio] = React.useState(true);

    // Create shuffled options and mapping
    const [shuffledOptions, setShuffledOptions] = React.useState<string[]>([]);
    const [originalToShuffledMap, setOriginalToShuffledMap] = React.useState<Map<number, number>>(new Map());
    const [shuffledToOriginalMap, setShuffledToOriginalMap] = React.useState<Map<number, number>>(new Map());

    // Add state to store resolved image URIs
    const [imageUris, setImageUris] = React.useState<Record<string, string>>({});

    // Shuffle options when question changes
    useEffect(() => {
        if (options.length > 0) {
            const shuffled = shuffleArray(options);
            setShuffledOptions(shuffled);
            
            // Create mapping between original and shuffled indices
            const originalToShuffled = new Map<number, number>();
            const shuffledToOriginal = new Map<number, number>();
            
            shuffled.forEach((optionId, shuffledIndex) => {
                const originalIndex = options.indexOf(optionId);
                originalToShuffled.set(originalIndex, shuffledIndex);
                shuffledToOriginal.set(shuffledIndex, originalIndex);
            });
            
            setOriginalToShuffledMap(originalToShuffled);
            setShuffledToOriginalMap(shuffledToOriginal);
        }
    }, [options, questionId]);

    // Scroll to top on mount
    useEffect(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []);

    // Find the correct word and its audio/label
    let audioPrompt: React.ReactNode = null;
    let correctIndex: number | null = null;
    let audioFile: string | undefined;
    if (
        words.length > 0 &&
        options.length > 0 &&
        correctOption !== null &&
        correctOption < options.length
    ) {
        const correctWord = words.find(
            (word) => String(word.id) === String(options[correctOption])
        );
        correctIndex = words.findIndex((word) => String(word.id) === String(options[correctOption]));
        audioFile = correctWord?.audio[selectedLanguage];
    }

    useEffect(() => {
        setAutoPlayAudio(true); // Reset autoPlayAudio to true for each new question
        setTimeout(() => {
            setAutoPlayAudio(false);
        }, 3000);
    }, [questionId]); // Add questionId as dependency to reset autoPlayAudio for each new question

    // Effect to resolve image URIs (local or remote)
    useEffect(() => {
        let isMounted = true;
        async function resolveImageUris() {
            const uris: Record<string, string> = {};
            for (const word of words) {
                const localUri = `${FileSystem.documentDirectory}image/${word.image}`;
                try {
                    const fileInfo = await FileSystem.getInfoAsync(localUri);
                    if (fileInfo.exists) {
                        uris[word.id] = localUri;
                    } else {
                        uris[word.id] = `${HOST_URL}/api/word/image/get/${word.image}`;
                    }
                } catch {
                    uris[word.id] = `${HOST_URL}/api/word/image/get/${word.image}`;
                }
            }
            if (isMounted) setImageUris(uris);
        }
        resolveImageUris();
        return () => { isMounted = false; };
    }, [words]);

    if (audioFile) {
        audioPrompt = (
            <View style={styles.audioPromptContainer}>
                <View style={styles.audioOnlyWrapper}>
                    <AudioPlayer audioUrls={[audioFile]} autoPlay={autoPlayAudio} text={words.find((word) => String(word.id) === String(options[correctOption!]))?.translations[selectedLanguage]} />
                </View>
            </View>
        );
    }

    //console.log('SelectImageQuestion options:', options);
    //console.log('SelectImageQuestion words:', words);
    //console.log('Shuffled options:', shuffledOptions);

    function handleSelectOption(index: number) {
        setSelectedIndex(index);
        setIsQuestionAnswered(true);
    }

    function handleCheckOrContinue() {
        if (selectedIndex === null) return;
        
        // Convert shuffled index back to original index for comparison
        const originalSelectedIndex = shuffledToOriginalMap.get(selectedIndex);
        const isAnswerCorrect = originalSelectedIndex === correctOption;
        
        const correctLabel = correctOption !== null ? words[correctOption]?.translations['en'] || '' : '';
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: correctLabel,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedIndex(null);
    }

    React.useEffect(() => {
        setOnCheck?.(handleCheckOrContinue);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheckOrContinue, resetQuestion]);

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <ThemedText style={[styles.title, { color: colors.text }]}>👁️ Which one is it?</ThemedText>
                {audioPrompt}
                <View style={styles.optionsGrid}>
                    {shuffledOptions.map((optionId, index) => {
                        const word = words.find(w => String(w.id) === String(optionId));
                        //console.log(`Option index ${index}: optionId=${optionId}, word=`, word);
                        if (!word) return null;
                        const selectedLanguageWord = word.translations[selectedLanguage];
                        const isSelected = selectedIndex === index;
                        const originalIndex = shuffledToOriginalMap.get(index);
                        const isCorrect = originalIndex === correctIndex;

                        return (
                            <Pressable
                                key={`option-${optionId}-${index}`}
                                style={[
                                    styles.optionCard,
                                    {
                                        backgroundColor: colors.surface,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                    },
                                    isSelected && styles.selectedOptionCard,
                                ]}
                                onPress={() => handleSelectOption(index)}
                                accessibilityLabel={`Select ${selectedLanguageWord}`}
                            >
                                <Image
                                    source={{ uri: imageUris[word.id] || `${HOST_URL}/api/word/image/get/${word.image}` }}
                                    style={styles.optionImage}
                                    contentFit="contain"
                                    transition={200}
                                />
                                <View style={styles.optionTextContainer}>
                                    <ThemedText style={[styles.englishTranslation, { color: colors.textSecondary }]}>
                                        {word.translations['en']}
                                    </ThemedText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {

    },
    scrollView: {

    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
        gap: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    audioPromptContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
    },
    audioPromptWord: {
        fontSize: 20,
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        textDecorationStyle: 'dashed',
        textAlign: 'center',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    optionCard: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 2,
        width: '45%',
        aspectRatio: 1,
        backgroundColor: '#fff',
    },
    selectedOptionCard: {
        borderWidth: 3,
    },
    optionImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
    },
    optionTextContainer: {
        padding: 8,
        gap: 4,
    },
    englishTranslation: {
        fontSize: 14,
        textAlign: 'center',
    },
    audioOnlyWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
}); 