import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { revenueCatService } from '../services/revenueCat';
import type { PurchasePackage } from '../services/revenueCat';

export function PurchaseTest() {
    const [offerings, setOfferings] = useState<PurchasePackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Alert.alert('Component Mounted', 'PurchaseTest component has been mounted');
        loadOfferings();
    }, []);

    async function loadOfferings() {
        try {
            Alert.alert('Loading State', 'Starting to load offerings...');
            setIsLoading(true);
            const currentOfferings = await revenueCatService.getOfferings();
            if (currentOfferings?.availablePackages) {
                Alert.alert('Offerings Loaded', `Found ${currentOfferings.availablePackages.length} packages`);
                setOfferings(currentOfferings.availablePackages);
            } else {
                Alert.alert('No Offerings', 'No available packages found');
            }
        } catch (error) {
            Alert.alert('Error Loading Offerings', `Failed to load offerings: ${error}`);
        } finally {
            setIsLoading(false);
            Alert.alert('Loading Complete', 'Finished loading offerings');
        }
    }

    async function handlePurchase(packageToPurchase: PurchasePackage) {
        try {
            Alert.alert('Purchase Initiated', `Starting purchase for: ${packageToPurchase.product.title}`);
            setIsLoading(true);
            const customerInfo = await revenueCatService.purchasePackage(packageToPurchase);
            Alert.alert('Success', 'Purchase completed successfully!');
            Alert.alert('Customer Info', JSON.stringify(customerInfo, null, 2));
        } catch (error: any) {
            Alert.alert('Purchase Error', `Failed to complete purchase: ${error.message || error}`);
        } finally {
            setIsLoading(false);
            Alert.alert('Purchase Process Complete', 'Purchase flow has finished');
        }
    }

    async function handleRestore() {
        try {
            Alert.alert('Restore Initiated', 'Starting to restore purchases...');
            setIsLoading(true);
            const customerInfo = await revenueCatService.restorePurchases();
            Alert.alert('Success', 'Purchases restored successfully!');
            Alert.alert('Restored Customer Info', JSON.stringify(customerInfo, null, 2));
        } catch (error: any) {
            Alert.alert('Restore Error', `Failed to restore purchases: ${error.message || error}`);
        } finally {
            setIsLoading(false);
            Alert.alert('Restore Process Complete', 'Restore flow has finished');
        }
    }

    async function handleShowPaywall() {
        try {
            Alert.alert('Paywall', 'Showing paywall...');
            await revenueCatService.showPaywall();
        } catch (error: any) {
            Alert.alert('Paywall Error', `Failed to show paywall: ${error.message || error}`);
        }
    }

    async function handleLoadOfferings() {
        try {
            Alert.alert('Loading State', 'Refreshing offerings...');
            setIsLoading(true);
            await loadOfferings();
        } catch (error: any) {
            Alert.alert('Error', `Failed to refresh offerings: ${error.message || error}`);
        } finally {
            setIsLoading(false);
        }
    }

    if (isLoading) {
        Alert.alert('Loading State', 'Currently loading...');
        return (
            <View style={styles.container}>
                <Text>Loading offerings...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Available Packages</Text>
            {offerings.map((pkg) => (
                <TouchableOpacity
                    key={pkg.identifier}
                    style={styles.packageButton}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isLoading}
                >
                    <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                    <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                </TouchableOpacity>
            ))}
            <TouchableOpacity
                style={styles.loadOfferingsButton}
                onPress={handleLoadOfferings}
                disabled={isLoading}
            >
                <Text style={styles.loadOfferingsButtonText}>Refresh Offerings</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.paywallButton}
                onPress={handleShowPaywall}
                disabled={isLoading}
            >
                <Text style={styles.paywallButtonText}>Show Paywall</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isLoading}
            >
                <Text style={styles.restoreButtonText}>Restore Purchases v9h50</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    packageButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    packageTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    packagePrice: {
        color: '#fff',
        fontSize: 14,
        marginTop: 5,
    },
    loadOfferingsButton: {
        backgroundColor: '#FF9500',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    loadOfferingsButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    paywallButton: {
        backgroundColor: '#5856D6',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    paywallButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    restoreButton: {
        backgroundColor: '#34C759',
        padding: 15,
        borderRadius: 10,
        marginTop: 20,
    },
    restoreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
}); 