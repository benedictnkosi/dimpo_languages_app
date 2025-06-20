import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { UpgradeToProButton } from '../app/components/UpgradeToProButton';

interface ProPromoCardProps {
    testID?: string;
    onPress: () => void;
    showCrown?: boolean;
}

export function ProPromoCard({ testID, onPress, showCrown = true }: ProPromoCardProps) {
    const { colors, isDark } = useTheme();

    return (
        <TouchableOpacity
            key={testID}
            style={[
                styles.subjectCard,
                styles.proPromoCard,
                {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    borderColor: colors.border
                }
            ]}
            activeOpacity={0.7}
            onPress={onPress}
            testID={testID}
        >
            {showCrown && (
                <View style={[styles.iconContainer, styles.proIconContainer]} testID={`${testID}-icon-container`}>
                    <View style={styles.proCrownCircle}>
                        <ThemedText style={styles.crownIcon}>👑</ThemedText>
                    </View>
                </View>
            )}
            <View style={styles.cardContent} testID={`${testID}-content`}>
                <ThemedText
                    style={[
                        styles.subjectName,
                        { color: isDark ? '#FFFFFF' : colors.text }
                    ]}
                    testID={`${testID}-title`}
                >
                    Upgrade to Pro Now!!
                </ThemedText>
                <ThemedText
                    style={[
                        styles.totalQuestionsText,
                        { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }
                    ]}
                >
                    🚀 Pro Learners Do more, not just 10 questions.
                </ThemedText>
                <ThemedText
                    style={[
                        styles.totalQuestionsText,
                        { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }
                    ]}
                >
                    ⏳ Limited offer: Get Pro for R9.99/week.
                </ThemedText>

                <View style={styles.proFeaturesContainer}>
                    <View style={styles.proFeature}>
                        <ThemedText style={styles.proFeatureIcon}>✨</ThemedText>
                        <ThemedText style={[styles.proFeatureText, { color: colors.textSecondary }]}>
                            Unlimited Quizzes & Lessons & Maths Practice
                        </ThemedText>
                    </View>
                    <View style={styles.proFeature}>
                        <ThemedText style={styles.proFeatureIcon}>🎯</ThemedText>
                        <ThemedText style={[styles.proFeatureText, { color: colors.textSecondary }]}>
                            Smart Subject Analytics
                        </ThemedText>
                    </View>
                </View>

                <UpgradeToProButton />
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    subjectCard: {
        width: '100%',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        position: 'relative',
        marginBottom: 16,
    },
    proPromoCard: {
        borderWidth: 2,
        borderColor: '#FCD34D',
        backgroundColor: '#1E1E1E',
    },
    iconContainer: {
        position: 'absolute',
        top: -32,
        left: 16,
        width: 64,
        height: 64,
        zIndex: 1,
        borderRadius: 16,
        padding: 8,
    },
    proIconContainer: {
        backgroundColor: 'transparent',
        borderRadius: 16,
        padding: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proCrownCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FDE68A',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    crownIcon: {
        fontSize: 32,
    },
    cardContent: {
        flex: 1,
        width: '100%',
        marginTop: 36,
    },
    subjectName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    totalQuestionsText: {
        fontSize: 14,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    proFeaturesContainer: {
        marginTop: 16,
        gap: 8,
    },
    proFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    proFeatureIcon: {
        fontSize: 18,
    },
    proFeatureText: {
        fontSize: 14,
    },
}); 