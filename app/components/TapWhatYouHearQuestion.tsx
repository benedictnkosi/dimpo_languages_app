import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';
import { useTheme } from '@/contexts/ThemeContext';
import { WordSelectionOptions } from './WordSelectionOptions';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TapWhatYouHearQuestionProps {
    words: Word[];
    sentenceWords: (string | number)[];
    options: (string | number)[];
    selectedLanguage: string;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

export function TapWhatYouHearQuestion({ words, sentenceWords, options, selectedLanguage, questionId, setOnCheck, setOnContinue, setIsQuestionAnswered }: TapWhatYouHearQuestionProps) {
    const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
    const { setFeedback, resetFeedback } = useFeedback();
    const { colors } = useTheme();

    // Get audio URLs for normal and slow (if available) - only calculate once when sentence words change
    const audioUrls = useMemo(() => {
        return sentenceWords
            .map(id => {
                const word = getWordById(words, id);
                return word?.audio?.[selectedLanguage];
            })
            .filter((url): url is string => !!url);
    }, [words, sentenceWords, selectedLanguage]);

    function handleSelectWord(id: number) {
        setSelectedWordIds(prev => [...prev, id]);
        setIsQuestionAnswered(true);
    }

    function handleRemoveWord(idx: number) {
        setSelectedWordIds(prev => prev.filter((_, i) => i !== idx));
        setIsQuestionAnswered(selectedWordIds.length > 1);
    }

    function handleCheck() {
        const selected = selectedWordIds.map(String);
        const correct = sentenceWords.map(String);
        const isAnswerCorrect =
            selected.length === correct.length &&
            selected.every((id, idx) => id === correct[idx]);

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
        setSelectedWordIds([]);
    }

    const correctAnswer = sentenceWords
        .map(id => {
            const word = getWordById(words, id);
            if (!word) return '';
            return word.translations[selectedLanguage];
        })
        .join(' ');

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            <ThemedText style={[styles.title, { color: colors.text }]}>👂 Can you hear it? Tap it!</ThemedText>
            <AudioPlayer audioUrls={audioUrls} autoPlay={true} showGif={true} />
            <WordSelectionOptions
                words={words}
                options={options}
                selectedWordIds={selectedWordIds}
                selectedLanguage={selectedLanguage}
                direction="from_english"
                onSelectWord={handleSelectWord}
                onRemoveWord={handleRemoveWord}
                playAudioOnSelect={false}
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
}); 