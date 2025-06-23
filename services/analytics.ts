import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = '44c9d6952845f26c209c7e42a6e8b6b3'; // Replace with your Mixpanel token

class Analytics {
    private static instance: Analytics;
    private mixpanel: Mixpanel;
    private initialized: boolean = false;

    private constructor() {
        this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, true); // Enable automatic events tracking
    }

    public static getInstance(): Analytics {
        if (!Analytics.instance) {
            Analytics.instance = new Analytics();
        }
        return Analytics.instance;
    }

    public async initialize(): Promise<void> {
        try {
            if (this.initialized) return;
            await this.mixpanel.init();
            this.initialized = true;
        } catch (error) {
            console.error('[Mixpanel] Error initializing analytics:', error);
        }
    }

    public async identify(userId: string): Promise<void> {
        try {
            await this.mixpanel.identify(userId);
        } catch (error) {
            console.error('[Mixpanel] Error identifying user:', error);
        }
    }

    public async track(eventName: string, properties?: Record<string, any>): Promise<void> {
        try {
            if (!this.initialized) {
                await this.initialize();
            }
            await this.mixpanel.track(eventName, properties);
        } catch (error) {
            console.error('[Mixpanel] Error tracking event:', error);
        }
    }

    public async setUserProperties(properties: Record<string, any>): Promise<void> {
        try {
            await this.mixpanel.people.set(properties);
        } catch (error) {
            console.error('[Mixpanel] Error setting user properties:', error);
        }
    }
}

export const analytics = Analytics.getInstance(); 