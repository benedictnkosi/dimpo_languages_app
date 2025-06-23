import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesOffering, PurchasesPackage, PurchasesStoreProduct } from 'react-native-purchases';
import RevenueCatUI from 'react-native-purchases-ui';

// Replace these with your actual API keys from RevenueCat dashboard
const REVENUECAT_API_KEYS = {
    ios: 'appl_TiVNYAbOGyLAaxNFPaEYDYstIKO',
    android: 'goog_msDThpJmdfRbbvfXvOdkRiHTSKr',
};

interface RevenueCatConfig {
    apiKey: string;
    appUserID?: string;
}

export interface PurchasePackage extends PurchasesPackage {
    identifier: string;
    offeringIdentifier: string;
    product: PurchasesStoreProduct;
}

class RevenueCatService {
    private static instance: RevenueCatService;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    private constructor() { }

    static getInstance(): RevenueCatService {
        if (!RevenueCatService.instance) {
            RevenueCatService.instance = new RevenueCatService();
        }
        return RevenueCatService.instance;
    }

    async initialize(config?: RevenueCatConfig): Promise<void> {
        if (this.isInitialized) return;

        // If initialization is in progress, return the existing promise
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization(config);
        return this.initializationPromise;
    }

    private async performInitialization(config?: RevenueCatConfig): Promise<void> {
        try {
            const apiKey = config?.apiKey || this.getApiKey();
            const appUserID = config?.appUserID;

            if (!apiKey) {
                throw new Error('RevenueCat API key is required');
            }

            await Purchases.configure({
                apiKey,
                appUserID,
                useAmazon: false,
            });

            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize RevenueCat:', error);
            this.isInitialized = false;
            this.initializationPromise = null;
            throw error;
        }
    }

    private getApiKey(): string {
        const platform = Platform.OS;
        if (platform !== 'ios' && platform !== 'android') {
            throw new Error(`Unsupported platform: ${platform}`);
        }
        const apiKey = REVENUECAT_API_KEYS[platform];

        if (!apiKey) {
            throw new Error(`No RevenueCat API key found for platform: ${platform}`);
        }

        return apiKey;
    }

    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.initialize();
        }
    }

    async getOfferings(): Promise<PurchasesOffering | null> {
        await this.ensureInitialized();
        try {
            const offerings = await Purchases.getOfferings();
            return offerings.current;
        } catch (error) {
            console.error('Failed to get offerings:', error);
            return null;
        }
    }

    async purchasePackage(packageToPurchase: PurchasePackage): Promise<CustomerInfo> {
        await this.ensureInitialized();
        try {
            const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
            return customerInfo;
        } catch (error) {
            console.error('Failed to purchase package:', error);
            throw error;
        }
    }

    async restorePurchases(): Promise<CustomerInfo> {
        await this.ensureInitialized();
        try {
            return await Purchases.restorePurchases();
        } catch (error) {
            console.error('Failed to restore purchases:', error);
            throw error;
        }
    }

    async getCustomerInfo(): Promise<CustomerInfo> {
        await this.ensureInitialized();
        try {
            return await Purchases.getCustomerInfo();
        } catch (error) {
            console.error('Failed to get customer info:', error);
            throw error;
        }
    }

    async identifyUser(userId: string): Promise<void> {
        await this.ensureInitialized();
        try {
            await Purchases.logIn(userId);
        } catch (error) {
            console.error('Failed to identify user:', error);
            throw error;
        }
    }

    async resetUser(): Promise<void> {
        await this.ensureInitialized();
        try {
            await Purchases.logOut();
        } catch (error) {
            console.error('Failed to reset user:', error);
            throw error;
        }
    }

    async showOfferings(): Promise<PurchasesOffering | null> {
        await this.ensureInitialized();
        try {
            const offerings = await Purchases.getOfferings();
            return offerings.current;
        } catch (error) {
            console.error('Failed to show offerings:', error);
            throw error;
        }
    }

    async showPaywall(): Promise<void> {
        await this.ensureInitialized();
        try {
            const offerings = await Purchases.getOfferings();
            if (!offerings.current) {
                throw new Error('No offerings available');
            }
            await RevenueCatUI.presentPaywall({
                offering: offerings.current,
                displayCloseButton: true,
            });
        } catch (error) {
            console.error('Failed to show paywall:', error);
            throw error;
        }
    }
}

export const revenueCatService = RevenueCatService.getInstance(); 