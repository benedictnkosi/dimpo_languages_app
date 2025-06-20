import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';
import { useTheme } from '@/contexts/ThemeContext';

interface Word {
    id: number;
    image?: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface CompleteTranslationQuestionProps {
    words: Word[];
    options: (string | number)[];
    selectedLanguage: string;
    blankIndex: number;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

export function CompleteTranslationQuestion({
    words,
    options,
    selectedLanguage,
    blankIndex,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: CompleteTranslationQuestionProps) {
    const [userInput, setUserInput] = useState('');
    const { setFeedback, resetFeedback, isChecked } = useFeedback();
    const theme = useTheme();

    // Get all words and their translations
    const correctWords = useMemo(() =>
        options
            .map(optionId => words.find(w => w.id === Number(optionId)))
            .filter((word): word is Word => word !== undefined),
        [options, words]
    );

    const correctAnswer = correctWords[blankIndex]?.translations[selectedLanguage] || '';

    const audioUris = useMemo(() =>
        correctWords.map(word => word.audio[selectedLanguage]).filter(Boolean),
        [correctWords, selectedLanguage]
    );

    // Create the sentence with blank or user input
    const sentenceParts = useMemo(() =>
        correctWords.map((word, index) => {
            if (index === blankIndex) {
                return userInput || '_____';
            }
            return word.translations[selectedLanguage];
        }),
        [correctWords, blankIndex, userInput, selectedLanguage]
    );

    const sentence = sentenceParts.join(' ');

    const audioComponent = useMemo(() => (
        <AudioPlayer audioUrls={audioUris} />
    ), [audioUris]);

    function resetQuestion() {
        resetFeedback();
        setUserInput('');
    }

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    function handleCheck() {
        Keyboard.dismiss();
        if (!userInput.trim()) return;
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

        // Create the correct sentence by replacing the blank with the correct answer
        const correctSentence = correctWords.map((word, index) => {
            if (index === blankIndex) {
                return correctAnswer;
            }
            return word.translations[selectedLanguage];
        }).join(' ');

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctSentence : undefined,
            questionId,
        });
    }

    function handleTextChange(text: string) {
        setUserInput(text);
        setIsQuestionAnswered(text.length > 0);
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={[styles.title, { color: theme.colors.text }]}>🧩 Can you finish it?</ThemedText>

            {audioComponent}

            <ThemedText style={styles.sentence}>{sentence}</ThemedText>

            <TextInput
                style={styles.input}
                value={userInput}
                onChangeText={handleTextChange}
                placeholder="Type the missing word"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isChecked}
                accessibilityLabel="Type the missing word"
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
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    sentence: {
        fontSize: 20,
        textAlign: 'center',
        marginVertical: 20,
        lineHeight: 28,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        fontSize: 18,
        color: '#222',
        backgroundColor: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
}); 