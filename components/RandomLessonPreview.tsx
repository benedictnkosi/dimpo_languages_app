import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useTheme } from '@/contexts/ThemeContext';
import { RandomAIQuestion } from '@/types/api';
import { getSubjectIcon } from '../utils/subjectIcons';
import { analytics } from '../services/analytics';

interface RandomLessonPreviewProps {
    randomLesson: RandomAIQuestion | null;
    onRefresh: () => void;
    showSubjectIcon?: boolean;
}

export function RandomLessonPreview({ randomLesson, onRefresh, showSubjectIcon = true }: RandomLessonPreviewProps) {
    const { colors, isDark } = useTheme();

    if (!randomLesson?.question) {
        return null;
    }

    const handleRefresh = async () => {
        // Track the refresh event
        await analytics.track('quick_bite_refresh', {
            subject_name: randomLesson.question.subject.name,
            subject_id: randomLesson.question.subject.id
        });
        onRefresh();
    };

    return randomLesson.question.ai_explanation.includes('Key Lesson') ? (
        <ThemedView style={[styles.container, {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'
        }]}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    {showSubjectIcon && (
                        <Image
                            source={getSubjectIcon(randomLesson.question.subject.name.split(' P')[0])}
                            style={styles.icon}
                        />
                    )}
                    <ThemedText style={[styles.title, { color: colors.text }]}>
                        🧠 Quick Bite
                    </ThemedText>
                </View>
                <TouchableOpacity
                    onPress={handleRefresh}
                    style={[styles.refreshButton, {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                    }]}
                    testID="refresh-quick-bite-button"
                >
                    <Ionicons name="refresh" size={18} color={colors.text} />
                </TouchableOpacity>
            </View>
            <View style={styles.content}>
                <ThemedText style={[styles.explanation, { color: colors.textSecondary }]}>
                    {randomLesson.question.ai_explanation.split('Key Lesson:')[1]?.trim().replace('***', '').trim()}
                </ThemedText>
            </View>
        </ThemedView>
    ) : null;
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 8,
        marginBottom: 24,
        marginTop: 24,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    icon: {
        width: 24,
        height: 24,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    content: {
        gap: 8,
    },
    question: {
        fontSize: 14,
        fontWeight: '500',
    },
    explanation: {
        fontSize: 14,
        lineHeight: 20,
    },
}); 