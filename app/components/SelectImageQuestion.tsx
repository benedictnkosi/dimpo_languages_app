import React, { useEffect, useRef } from 'react';
import { StyleSheet, Pressable, View, Dimensions, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from './AudioPlayer';
import { useTheme } from '@/contexts/ThemeContext';

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
    areResourcesDownloaded: boolean;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

function useAudioUri(audioFile: string | undefined, areResourcesDownloaded: boolean) {
    const [uri, setUri] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (!audioFile) {
            setUri(undefined);
            return;
        }
        if (areResourcesDownloaded) {
            const localUri = `${FileSystem.documentDirectory}audio/${audioFile}`;
            FileSystem.getInfoAsync(localUri).then(info => {
                if (info.exists) setUri(localUri);
                else setUri(`${HOST_URL}/api/word/audio/get/${audioFile}`);
            });
        } else {
            setUri(`${HOST_URL}/api/word/audio/get/${audioFile}`);
        }
    }, [audioFile, areResourcesDownloaded]);

    return uri;
}

export function SelectImageQuestion({
    words,
    options,
    correctOption,
    selectedLanguage,
    areResourcesDownloaded,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: SelectImageQuestionProps) {
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const { setFeedback, resetFeedback } = useFeedback();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);
    const { colors, isDark } = useTheme();
    const [autoPlayAudio, setAutoPlayAudio] = React.useState(true);

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

    const audioUrl = useAudioUri(audioFile, areResourcesDownloaded);

    // Add useEffect for initial audio playback
    React.useEffect(() => {
        if (audioUrl) {
            const sound = new Audio.Sound();
            sound.loadAsync({ uri: audioUrl }).then(() => {
                sound.playAsync();
            });
            return () => {
                sound.unloadAsync();
            };
        }
    }, [audioUrl]); // Depend on audioUrl instead of empty array

    if (audioFile && audioUrl) {
        audioPrompt = (
            <View style={styles.audioPromptContainer}>
                <View style={styles.audioOnlyWrapper}>
                    <AudioPlayer audioUrls={[audioFile]} autoPlay={autoPlayAudio} text={words.find((word) => String(word.id) === String(options[correctOption!]))?.translations[selectedLanguage]} />
                </View>
            </View>
        );
    }

    console.log('SelectImageQuestion options:', options);
    console.log('SelectImageQuestion words:', words);

    function handleSelectOption(index: number) {
        setSelectedIndex(index);
        setIsQuestionAnswered(true);
        setAutoPlayAudio(false);
    }

    function handleCheckOrContinue() {
        if (selectedIndex === null) return;
        const isAnswerCorrect = selectedIndex === correctOption;
        const correctLabel = correctOption !== null ? words[correctOption]?.translations['en'] || '' : '';
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctLabel : undefined,
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
                    {options.map((optionId, index) => {
                        const word = words.find(w => String(w.id) === String(optionId));
                        console.log(`Option index ${index}: optionId=${optionId}, word=`, word);
                        if (!word) return null;
                        const selectedLanguageWord = word.translations[selectedLanguage];
                        const isSelected = selectedIndex === index;
                        const isCorrect = index === correctIndex;

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
                                    source={{ uri: `${HOST_URL}/api/word/image/get/${word.image}` }}
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
    },
    selectedOptionCard: {
        borderWidth: 3,
    },
    optionImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
        backgroundColor: 'transparent',
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