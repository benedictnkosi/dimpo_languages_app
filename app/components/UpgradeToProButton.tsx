import React, { useState } from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Paywall } from './Paywall';

interface UpgradeToProButtonProps {
    style?: StyleProp<ViewStyle>;
    text?: string;
    onSuccess?: () => void;
    onClose?: () => void;
}

export function UpgradeToProButton({ style, text = 'Upgrade to Pro', onSuccess, onClose }: UpgradeToProButtonProps) {
    const { isDark, colors } = useTheme();
    const [showPaywall, setShowPaywall] = useState(false);

    function handlePress() {
        setShowPaywall(true);
    }

    function handlePaywallSuccess() {
        setShowPaywall(false);
        onSuccess?.();
    }

    function handlePaywallClose() {
        setShowPaywall(false);
        onClose?.();
    }

    return (
        <>
            <TouchableOpacity
                style={[styles.upgradeButton, style]}
                onPress={handlePress}
                activeOpacity={0.85}
                testID="upgrade-to-pro-btn"
            >
                <LinearGradient
                    colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                    style={styles.upgradeButtonGradient}
                >
                    <ThemedText style={styles.upgradeButtonText}>
                        ✨ Upgrade to Pro
                    </ThemedText>
                </LinearGradient>
            </TouchableOpacity>
            {showPaywall && (
                <Paywall
                    onSuccess={handlePaywallSuccess}
                    onClose={handlePaywallClose}
                />
            )}
        </>
    );
}

const styles = StyleSheet.create({
    upgradeButton: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
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
}); 