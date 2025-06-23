import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { LANGUAGE_EMOJIS } from './language-emojis';
import { ThemedText } from './ThemedText';

interface LessonHeaderProps {
    title: string;
    showBackButton?: boolean;
    languageName?: string;
    subText?: string;
    onBackPress?: () => void;
    topPadding?: number;
}

export function LessonHeader({
    title,
    showBackButton = true,
    languageName,
    subText,
    onBackPress,
    topPadding = Platform.select({
        ios: 16,
        android: 12,
    })
}: LessonHeaderProps) {
    const { isDark, colors } = useTheme();
    const emoji = languageName && LANGUAGE_EMOJIS[languageName] ? LANGUAGE_EMOJIS[languageName] : '🇿🇦';

    return (
        <View style={[styles.headerWrapper, { backgroundColor: colors.card }]}>
            <View style={styles.headerContent}>
                {showBackButton && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onBackPress || (() => router.back())}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                    >
                        <Ionicons
                            name="close"
                            size={28}
                            color={colors.text}
                        />
                    </TouchableOpacity>
                )}
                <View style={styles.titleColumn}>
                    <View style={styles.titleRow}>
                        <ThemedText style={styles.emoji} accessibilityLabel="Language emoji">
                            {emoji}
                        </ThemedText>
                        <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                            {title}
                        </ThemedText>
                    </View>
                    {subText && (
                        <ThemedText style={[styles.subText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                            {subText}
                        </ThemedText>
                    )}
                </View>
                {showBackButton && <View style={styles.backButton} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrapper: {
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 0,
        paddingBottom: 18,
        paddingHorizontal: 18,
        marginTop: 10,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleColumn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emoji: {
        fontSize: 24,
        marginRight: 2,
    },
    title: {
        flexShrink: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.2,
    },
    subText: {
        fontSize: 13,
        textAlign: 'center',
        marginTop: 2,
        opacity: 0.85,
    },
}); 