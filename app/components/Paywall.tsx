import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/services/analytics';
import React from 'react';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

interface PaywallProps {
    onSuccess?: () => void;
    onClose?: () => void;
    offerings?: any;
}

export function Paywall({ onSuccess, onClose, offerings }: PaywallProps) {
    const { user } = useAuth();

    const showPaywall = async () => {
        if (!user?.uid) return;

        try {
            // Track paywall load event
            await analytics.track('paywall_shown', {
                userId: user.uid,
                timestamp: new Date().toISOString()
            });

            // Set the current user's UID as the RevenueCat identifier
            await Purchases.logIn(user.uid);

            // If no offerings provided, fetch them
            const currentOfferings = offerings || (await Purchases.getOfferings()).current;
            if (!currentOfferings) {
                throw new Error('No offerings available');
            }

            const result = await RevenueCatUI.presentPaywall({
                offering: currentOfferings,
                displayCloseButton: true,
            });

            // Check if purchase was successful
            if (result === PAYWALL_RESULT.PURCHASED) {
                // Track successful purchase
                await analytics.track('purchase_successful', {
                    userId: user.uid,
                    timestamp: new Date().toISOString()
                });

                // Wait a brief moment to show the success state
                await new Promise(resolve => setTimeout(resolve, 1000));
                onSuccess?.();
            } else {
                // Track paywall closed without purchase
                await analytics.track('paywall_closed', {
                    userId: user.uid,
                    timestamp: new Date().toISOString()
                });
                onClose?.();
            }
        } catch (error) {
            // Track paywall error
            await analytics.track('paywall_error', {
                userId: user.uid,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            });
            console.error('Failed to show paywall:', error);
            onClose?.();
        }
    };

    // Show paywall immediately when component mounts
    React.useEffect(() => {
        showPaywall();
    }, []);

    return null;
} 