import { ThemedText } from '@/components/ThemedText';
import { HOST_URL } from '@/config/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Audio } from 'expo-av';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface WordSelectionOptionsProps {
    words: Word[];
    options: (string | number)[];
    selectedWordIds: number[];
    selectedLanguage: string;
    direction: 'from_english' | 'to_english';
    onSelectWord: (id: number) => void;
    onRemoveWord: (index: number) => void;
    playAudioOnSelect?: boolean;
}

export function WordSelectionOptions({
    words,
    options,
    selectedWordIds,
    selectedLanguage,
    direction,
    onSelectWord,
    onRemoveWord,
    playAudioOnSelect = true,
}: WordSelectionOptionsProps) {
    const { colors, isDark } = useTheme();

    // Helper: get word by id
    function getWordById(id: string | number) {
        return words.find(w => w.id === Number(id));
    }

    // Create a stable shuffled array that only gets created once
    const shuffledOptions = useMemo(() => {
        const shuffled = [...options];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, [options]); // Only depend on options, not filteredOptions

    // Filter out already selected words from the stable shuffled array
    const availableOptions = shuffledOptions.filter((id) => {
        if (selectedWordIds.includes(Number(id))) return false;
        const word = getWordById(id);
        if (!word) return false;
        const text = direction === 'from_english'
            ? word.translations[selectedLanguage]
            : word.translations['en'];
        return !!text && text.trim().length > 0;
    });

    async function handleSelectOption(id: string | number) {
        const word = getWordById(id);
        if (playAudioOnSelect && direction === 'from_english' && word?.audio?.[selectedLanguage]) {
            const sound = new Audio.Sound();
            const audioUrl = `${HOST_URL}/api/word/audio/get/${word.audio[selectedLanguage]}`;
            try {
                await sound.loadAsync({ uri: audioUrl });
                await sound.playAsync();
                sound.setOnPlaybackStatusUpdate((status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        sound.unloadAsync();
                    }
                });
            } catch (error) {
                console.log('error loading audio');
            }
        }
        onSelectWord(Number(id));
    }

    return (
        <>
            {/* Selected answer row */}
            <View style={styles.selectedRow}>
                {selectedWordIds.map((id, idx) => {
                    const word = getWordById(id);
                    if (!word) return null;
                    const text = direction === 'from_english'
                        ? word.translations[selectedLanguage]
                        : word.translations['en'];
                    return (
                        <Pressable
                            key={idx}
                            style={[styles.selectedCard, { backgroundColor: isDark ? colors.surface : '#E0F2F1' }]}
                            onPress={() => onRemoveWord(idx)}
                        >
                            <ThemedText style={[styles.selectedCardText, { color: isDark ? colors.success : '#00796B' }]}>{text}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
            {/* Single line for the answer */}
            <View style={[styles.singleAnswerLine, { backgroundColor: colors.border }]} />
            {/* Option cards */}
            <View style={styles.optionsGrid}>
                {availableOptions.map((id) => {
                    const word = getWordById(id);
                    if (!word) return null;
                    const text = direction === 'from_english'
                        ? word.translations[selectedLanguage]
                        : word.translations['en'];
                    return (
                        <Pressable
                            key={id}
                            style={[styles.optionCard, {
                                backgroundColor: isDark ? colors.surface : '#fff',
                                borderColor: colors.border,
                            }]}
                            onPress={() => handleSelectOption(id)}
                        >
                            <ThemedText style={[styles.optionText, { color: colors.text }]}>{text}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    selectedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        minHeight: 40,
        marginBottom: 1,
        justifyContent: 'center',
    },
    selectedCard: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 1,
        marginHorizontal: 2,
    },
    selectedCardText: {
        fontSize: 18,
        fontWeight: '600',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 80,
    },
    optionCard: {
        borderRadius: 12,
        borderWidth: 1.5,
        paddingVertical: 12,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 80,
        minHeight: 36,
        margin: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    singleAnswerLine: {
        height: 2,
        borderRadius: 1,
        marginTop: 1,
        marginBottom: 16,
        marginHorizontal: 8,
        alignSelf: 'stretch',
    },
});

export default WordSelectionOptions; 