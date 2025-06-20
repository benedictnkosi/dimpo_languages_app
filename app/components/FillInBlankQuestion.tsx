import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';
import { useTheme } from '@/contexts/ThemeContext';
import { colors } from '../constants/Colors';
import { AudioPlayer } from './AudioPlayer';

interface Word {
    id: number;
    translations: Record<string, string>;
    audio?: Record<string, string[]>;
}

interface FillInBlankQuestionProps {
    words: Word[];
    sentenceWords: (string | number)[];
    options: (string | number)[];
    blankIndex: number;
    selectedLanguage: string;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
    audioUrls?: string[];
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

export function FillInBlankQuestion({
    words,
    sentenceWords,
    options,
    blankIndex,
    selectedLanguage,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
    audioUrls,
}: FillInBlankQuestionProps) {
    // Logging props and state for debugging
    console.log('[FillInBlankQuestion] words:', words);
    console.log('[FillInBlankQuestion] props:', {
        words,
        sentenceWords,
        options,
        blankIndex,
        selectedLanguage,
        questionId
    });

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const { setFeedback, resetFeedback } = useFeedback();
    const { isDark } = useTheme();
    const palette = isDark ? colors.dark : colors.light;
    const [userInput, setUserInput] = useState('');
    const [autoPlayAudio, setAutoPlayAudio] = React.useState(true);

    // Additional logging for state
    console.log('[FillInBlankQuestion] sentenceWords:', sentenceWords);
    console.log('[FillInBlankQuestion] options:', options);
    console.log('[FillInBlankQuestion] selectedOption:', selectedOption);

    // Fallback: If sentenceWords is empty, build a sentence from options and blankIndex
    const effectiveSentenceWords = (sentenceWords && sentenceWords.length > 0)
        ? sentenceWords
        : options.map((id, idx) => idx === blankIndex ? null : id);

    // Build the sentence with a blank (TextInput)
    const sentenceWithBlank = effectiveSentenceWords.map((id, idx) => {
        if (id === null) {
            return (
                <TextInput
                    key={idx}
                    style={[
                        styles.blank,
                        {
                            color: palette.text,
                            backgroundColor: isDark ? '#181A20' : '#fff',
                            minWidth: 64,
                            textAlign: 'center',
                            fontSize: 20,
                            fontWeight: '600',
                            letterSpacing: 2,
                        },
                    ]}
                    value={userInput}
                    onChangeText={text => {
                        setUserInput(text);
                        setIsQuestionAnswered(text.trim().length > 0);
                        setAutoPlayAudio(false);
                    }}
                    placeholderTextColor={palette.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel="Type your answer in the blank"
                    returnKeyType="done"
                />
            );
        }
        const word = getWordById(words, id);
        return (
            <View key={idx} style={styles.sentenceWord}>
                <ThemedText style={[styles.sentenceWordText, { color: palette.text }]}>{word?.translations[selectedLanguage]}</ThemedText>
            </View>
        );
    });

    // Only show the fallback message if both sentenceWords and options are empty
    if ((!sentenceWords || sentenceWords.length === 0) && (!options || options.length === 0)) {
        return (
            <ThemedView style={[styles.container, { backgroundColor: palette.background }]}>
                <ThemedText style={[styles.title, { color: palette.text }]}>Fill in the blank</ThemedText>
                <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                    <ThemedText style={{ color: palette.textSecondary, fontSize: 18 }}>No sentence data available.</ThemedText>
                </View>
            </ThemedView>
        );
    }

    const availableOptions = options.filter(id => selectedOption === null || Number(id) !== selectedOption);

    function handleSelectOption(id: string | number) {
        setSelectedOption(Number(id));
        setIsQuestionAnswered(true);
    }

    function handleCheck() {
        const correctWord = getWordById(words, sentenceWords[blankIndex] ?? options[blankIndex]);
        const correctAnswer = correctWord?.translations[selectedLanguage] || '';
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctAnswer : undefined,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedOption(null);
        setUserInput('');
    }

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    // Collect audio URLs for all options in the selected language (use options, not availableOptions)
    const allOptionAudio = options
        .map(optId => {
            const w = getWordById(words, optId);
            if (!w) return null;
            const audio = w.audio?.[selectedLanguage];
            if (!audio) return null;
            return Array.isArray(audio) ? audio : [audio];
        })
        .flat()
        .filter((x): x is string => Boolean(x));
    console.log('[FillInBlankQuestion] allOptionAudio:', allOptionAudio);

    return (
        <ThemedView style={[styles.container, { backgroundColor: palette.card }]}>
            <ThemedText style={[styles.title, { color: palette.text }]}>✏️ Can you finish this?</ThemedText>
            {allOptionAudio.length > 0 && (
                <AudioPlayer audioUrls={allOptionAudio} showGif={true} autoPlay={autoPlayAudio} />
            )}
            <View style={styles.optionsGrid}>
                {availableOptions.map((id) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <View key={id} style={{ flexDirection: 'row', alignItems: 'center', margin: 4 }}>
                            {/* Optionally, render the word text or button here if needed */}
                        </View>
                    );
                })}
            </View>
            <View style={styles.sentenceRow}>{sentenceWithBlank}</View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    sentenceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        minHeight: 48,
    },
    sentenceWord: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    sentenceWordText: {
        fontSize: 20,
        color: '#222',
        fontWeight: '500',
    },
    blank: {
        minWidth: 48,
        minHeight: 32,
        borderBottomWidth: 2,
        borderColor: '#A1CEDC',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
    },
    blankText: {
        fontSize: 20,
        color: '#A1CEDC',
        fontWeight: '600',
        letterSpacing: 2,
    },
    blankFilled: {
        minWidth: 48,
        minHeight: 32,
        borderBottomWidth: 2,
        borderColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
        backgroundColor: '#E0F7FA',
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    blankFilledText: {
        fontSize: 20,
        color: '#00796B',
        fontWeight: '600',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 16,
    },
    optionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        paddingVertical: 16,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
        minHeight: 44,
        margin: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedOptionCard: {
        backgroundColor: '#E0F7FA',
        borderColor: '#4CAF50',
    },
    optionText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        textAlign: 'center',
    },
}); 