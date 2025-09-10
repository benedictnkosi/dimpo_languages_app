import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Keyboard, StyleSheet, TextInput, View } from 'react-native';
import { useFeedback } from '../contexts/FeedbackContext';

interface Word {
    id: number;
    image?: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface CompleteTranslationQuestionProps {
    words: Word[];
    selectedLanguage: string;
    blankIndex: number;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

// Function to calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
}

// Function to check if answer is correct with spelling tolerance
function isAnswerCorrectWithSpellingTolerance(userInput: string, correctAnswer: string, maxDistance: number = 1): boolean {
    const userTrimmed = userInput.trim().toLowerCase();
    const correctTrimmed = correctAnswer.trim().toLowerCase();
    
    // Exact match
    if (userTrimmed === correctTrimmed) {
        return true;
    }
    
    // Check for spelling errors within tolerance
    const distance = levenshteinDistance(userTrimmed, correctTrimmed);
    return distance <= maxDistance;
}

export function CompleteTranslationQuestion({
    words,
    selectedLanguage,
    blankIndex,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: CompleteTranslationQuestionProps) {
    if (!Array.isArray(words)) {
        return <ThemedText>Question data is missing.</ThemedText>;
    }

    const [userInput, setUserInput] = useState('');
    const { setFeedback, resetFeedback, isChecked } = useFeedback();
    const theme = useTheme();

    const correctAnswer = words[blankIndex]?.translations[selectedLanguage] || '';

    // Get English translation for the speech bubble
    const englishTranslation = useMemo(() => {
        return words.map(word => word.translations['en'] || '').join(' ');
    }, [words]);

    // Create the sentence with blank or user input
    const sentenceParts = useMemo(() =>
        words.map((word, index) => {
            if (index === blankIndex) {
                return null; // We'll handle the blank inline
            }
            return word.translations[selectedLanguage];
        }),
        [words, blankIndex, selectedLanguage]
    );

    const sentence = sentenceParts.join(' ');

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
        
        const isAnswerCorrect = isAnswerCorrectWithSpellingTolerance(userInput, correctAnswer);

        // Create the correct sentence by replacing the blank with the correct answer
        const correctSentence = words.map((word, index) => {
            if (index === blankIndex) {
                return correctAnswer;
            }
            return word.translations[selectedLanguage];
        }).join(' ');

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: correctSentence,
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

            {/* Speech bubble with English translation */}
            <View style={styles.speechBubble}>
                <Image 
                    source={require('@/assets/images/impatient-kitty.gif')} 
                    style={styles.catImage}
                    resizeMode="contain"
                />
                <View style={styles.speechBubbleContent}>
                    <ThemedText style={styles.speechBubbleText}>{englishTranslation}</ThemedText>
                    <View style={styles.speechBubbleTail} />
                </View>
            </View>

            <View style={styles.sentenceRow}>
                {words.map((word, index) => {
                    if (index === blankIndex) {
                        return (
                            <TextInput
                                key={index}
                                style={styles.blank}
                                value={userInput}
                                onChangeText={handleTextChange}
                                
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!isChecked}
                                accessibilityLabel="Type the missing word"
                                returnKeyType="done"
                                onSubmitEditing={handleCheck}
                                placeholderTextColor="#A1CEDC"
                            />
                        );
                    }
                    return (
                        <View key={index} style={styles.sentenceWord}>
                            <ThemedText style={styles.sentenceWordText}>
                                {word.translations[selectedLanguage]}
                            </ThemedText>
                        </View>
                    );
                })}
            </View>
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
    speechBubble: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 16,
        gap: 8,
    },
    catImage: {
        width: 120,
        height: 120,
    },
    speechBubbleContent: {
        backgroundColor: '#F0F8FF',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 24,
        maxWidth: '70%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 54,
        marginLeft: 16,
        position: 'relative',
    },
    speechBubbleText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'left',
        lineHeight: 22,
    },
    speechBubbleTail: {
        position: 'absolute',
        left: -16,
        top: '90%',
        transform: [{ translateY: -8 }],
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 8,
        borderBottomWidth: 8,
        borderRightWidth: 16,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: '#F0F8FF',
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
        color: '#222',
        backgroundColor: 'transparent',
        textAlign: 'center',
        fontSize: 20,
        fontWeight: '600',
        letterSpacing: 2,
        paddingVertical: 0,
        paddingHorizontal: 4,
    },
}); 