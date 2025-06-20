import React, { createContext, useContext, useEffect, useState } from 'react';
import { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { revenueCatService, PurchasePackage } from '../services/revenueCat';

interface RevenueCatContextType {
    customerInfo: CustomerInfo | null;
    offerings: PurchasesOffering | null;
    isLoading: boolean;
    error: Error | null;
    purchasePackage: (packageToPurchase: PurchasePackage) => Promise<void>;
    restorePurchases: () => Promise<void>;
    identifyUser: (userId: string) => Promise<void>;
    resetUser: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        initializeRevenueCat();
    }, []);

    async function initializeRevenueCat() {
        try {
            setIsLoading(true);
            await revenueCatService.initialize();
            const [customerInfo, offerings] = await Promise.all([
                revenueCatService.getCustomerInfo(),
                revenueCatService.getOfferings(),
            ]);
            setCustomerInfo(customerInfo);
            setOfferings(offerings);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to initialize RevenueCat'));
        } finally {
            setIsLoading(false);
        }
    }

    async function purchasePackage(packageToPurchase: PurchasePackage) {
        try {
            setIsLoading(true);
            const updatedCustomerInfo = await revenueCatService.purchasePackage(packageToPurchase);
            setCustomerInfo(updatedCustomerInfo);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to purchase package'));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    async function restorePurchases() {
        try {
            setIsLoading(true);
            const updatedCustomerInfo = await revenueCatService.restorePurchases();
            setCustomerInfo(updatedCustomerInfo);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to restore purchases'));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    async function identifyUser(userId: string) {
        try {
            setIsLoading(true);
            await revenueCatService.identifyUser(userId);
            const updatedCustomerInfo = await revenueCatService.getCustomerInfo();
            setCustomerInfo(updatedCustomerInfo);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to identify user'));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    async function resetUser() {
        try {
            setIsLoading(true);
            await revenueCatService.resetUser();
            const updatedCustomerInfo = await revenueCatService.getCustomerInfo();
            setCustomerInfo(updatedCustomerInfo);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to reset user'));
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    const value = {
        customerInfo,
        offerings,
        isLoading,
        error,
        purchasePackage,
        restorePurchases,
        identifyUser,
        resetUser,
    };

    return (
        <RevenueCatContext.Provider value={value}>
            {children}
        </RevenueCatContext.Provider>
    );
}

export function useRevenueCat() {
    const context = useContext(RevenueCatContext);
    if (context === undefined) {
        throw new Error('useRevenueCat must be used within a RevenueCatProvider');
    }
    return context;
} 