import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';

interface FollowedLearnerStatsCardProps {
    questionsToday: number;
    questionsWeek: number;
    chaptersToday: number;
    chaptersWeek: number;
    onViewReport: () => void;
}

export function FollowedLearnerStatsCard({
    questionsToday,
    questionsWeek,
    chaptersToday,
    chaptersWeek,
    onViewReport,
}: FollowedLearnerStatsCardProps) {
    const { colors, isDark } = useTheme();

    const stats = [
        {
            icon: 'today-outline',
            value: questionsToday,
            label: 'questions today',
        },
        {
            icon: 'calendar-outline',
            value: questionsWeek,
            label: 'questions this week',
        },
        {
            icon: 'book-outline',
            value: chaptersToday,
            label: 'chapters today',
        },
        {
            icon: 'library-outline',
            value: chaptersWeek,
            label: 'chapters this week',
        },
    ];

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                },
            ]}
            accessibilityRole="summary"
            accessible
        >
            <View style={styles.grid}>
                {stats.map((stat, idx) => (
                    <View key={stat.label} style={styles.statItem}>
                        <Ionicons
                            name={stat.icon as any}
                            size={22}
                            color={isDark ? colors.primary : '#3B82F6'}
                            style={styles.icon}
                            accessibilityLabel={stat.label}
                        />
                        <ThemedText style={styles.value}>{stat.value}</ThemedText>
                        <ThemedText style={styles.label}>{stat.label}</ThemedText>
                    </View>
                ))}
            </View>
            <TouchableOpacity
                style={[
                    styles.reportButton,
                    { backgroundColor: isDark ? colors.primary : '#3B82F6' },
                ]}
                onPress={onViewReport}
                accessibilityRole="button"
                accessibilityLabel="View Report"
            >
                <Ionicons name="analytics-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <ThemedText style={styles.reportButtonText}>View Report</ThemedText>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        marginTop: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statItem: {
        width: '48%',
        marginBottom: 12,
        alignItems: 'center',
        flexDirection: 'column',
        paddingVertical: 8,
        borderRadius: 8,
    },
    icon: {
        marginBottom: 2,
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    label: {
        fontSize: 13,
        opacity: 0.7,
        textAlign: 'center',
    },
    reportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 4,
    },
    reportButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 15,
    },
}); 