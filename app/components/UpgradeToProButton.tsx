import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';

interface UpgradeToProButtonProps {
    style?: StyleProp<ViewStyle>;
    text?: string;
    onPress?: () => void;
    loading?: boolean;
}

export function UpgradeToProButton({ style, text = 'Upgrade to Pro', onPress, loading = false }: UpgradeToProButtonProps) {
    const { isDark } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.upgradeButton, style, loading && { opacity: 0.6 }]}
            onPress={onPress}
            activeOpacity={0.85}
            testID="upgrade-to-pro-btn"
            disabled={loading}
        >
            <View style={styles.upgradeButtonWrapper}>
                <LinearGradient
                    colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                    style={styles.upgradeButtonGradient}
                >
                    {loading ? (
                        <ThemedText style={styles.upgradeButtonText}>Loading...</ThemedText>
                    ) : (
                        <ThemedText style={styles.upgradeButtonText}>
                            ✨ {text}
                        </ThemedText>
                    )}
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    upgradeButton: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
    },
    upgradeButtonGradient: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    upgradeButtonWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});

export default UpgradeToProButton; 