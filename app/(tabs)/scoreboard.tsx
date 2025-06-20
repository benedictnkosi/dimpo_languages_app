import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';

interface Learner {
    id: number;
    uid: string;
    name: string;
    points: number;
    avatar: string;
    subscription: string;
    position?: number;
}

interface ScoreboardResponse {
    topLearners: Learner[];
    currentLearner: Learner;
}

export default function ScoreboardScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [data, setData] = useState<ScoreboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchScoreboard() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await fetch(
                    `${process.env.EXPO_PUBLIC_API_URL}/api/language-learners/scoreboard/${user?.uid}`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch scoreboard');
                }
                const jsonData = await response.json();
                setData(jsonData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch scoreboard');
            } finally {
                setIsLoading(false);
            }
        }

        if (user?.uid) {
            fetchScoreboard();
        }
    }, [user?.uid]);

    const renderLearnerItem = ({ item, index }: { item: Learner; index: number }) => {
        const isCurrentUser = item.uid === user?.uid;
        const avatarUrl = item.avatar.includes('.png')
            ? item.avatar
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.avatar}`;

        return (
            <View
                style={[
                    styles.learnerItem,
                    {
                        backgroundColor: isCurrentUser ? colors.primary + '20' : isDark ? colors.card : '#FFFFFF',
                        borderColor: isDark ? colors.border : '#E5E7EB',
                    },
                ]}>
                <View style={styles.rankContainer}>
                    <Text style={[styles.rank, { color: colors.textSecondary }]}>#{index + 1}</Text>
                </View>
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                <View style={styles.learnerInfo}>
                    <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.points, { color: colors.textSecondary }]}>
                        {item.points} points
                    </Text>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.loadingText, { color: colors.text }]}>Loading scoreboard...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
            </View>
            <FlatList
                data={data?.topLearners}
                renderItem={renderLearnerItem}
                keyExtractor={(item) => item.uid}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 16,
    },
    learnerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rank: {
        fontSize: 16,
        fontWeight: '600',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    learnerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    points: {
        fontSize: 14,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
}); 