import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, TextInput } from 'react-native';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';

interface Word {
    id: number;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TypeWhatYouHearQuestionProps {
    words: Word[];
    options: (string | number)[];
    selectedLanguage: string;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

export function TypeWhatYouHearQuestion({
    words,
    options = [],
    selectedLanguage,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: TypeWhatYouHearQuestionProps) {
    const [userInput, setUserInput] = useState('');
    const { setFeedback, resetFeedback } = useFeedback();
    const { colors, isDark } = useTheme()
    const [autoPlay, setAutoPlay] = React.useState(true);

    // Disable auto-play after 3 seconds on page load
    useEffect(() => {
        setAutoPlay(true); // Reset autoPlay to true for each new question
        setTimeout(() => {
            setAutoPlay(false);
        }, 3000);
    }, [questionId]); // Add questionId as dependency to reset autoPlay for each new question

    // Get all correct words and concatenate their translations
    const correctWords = options
        .map(optionId => words.find(w => w.id === Number(optionId)))
        .filter((word): word is Word => word !== undefined);
    const correctAnswer = correctWords
        .map(word => word.translations[selectedLanguage])
        .join(' ');

    // Get all audio URIs for the sequence
    const audioUrls = correctWords
        .map(word => word.audio[selectedLanguage])
        .filter(Boolean);

    function resetQuestion() {
        resetFeedback();
        setUserInput('');
    }

    function handleCheck() {
        Keyboard.dismiss();
        if (!userInput.trim()) return;
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctAnswer : undefined,
            questionId,
        });
    }

    function handleTextChange(text: string) {
        setUserInput(text);
        setIsQuestionAnswered(text.length > 0);
        if (text.length > 0) {
            setAutoPlay(false);
        }
    }

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            <ThemedText style={[styles.title, { color: colors.text }]}>Type what you hear</ThemedText>
            <AudioPlayer audioUrls={audioUrls} autoPlay={autoPlay} />
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: isDark ? colors.surface : '#fff',
                        borderColor: colors.border,
                        color: colors.text,
                    },
                ]}
                value={userInput}
                onChangeText={handleTextChange}
                placeholder="Type your answer"
                placeholderTextColor={isDark ? colors.textSecondary : '#888'}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Type what you hear"
                returnKeyType="done"
                onSubmitEditing={handleCheck}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
    },
});

export default TypeWhatYouHearQuestion; 