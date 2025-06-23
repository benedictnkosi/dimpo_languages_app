import { app } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Deep linking types
export interface NotificationData {
    threadId?: string;
    subjectName?: string;
    badgeName?: string;
    learnerUid?: string;
    learnerName?: string;
    followerUid?: string;
    screen?: string;
    data?: any;
    [key: string]: any;
}

export interface DeepLinkConfig {
    path: '/posts/[threadId]' | '/report/[uid]' | '/(tabs)/social' | '/_auth' | '/constants' | '/forgot-password' | '/threads/[id]' | string;
    params?: Record<string, string>;
}

// Deep link handler
export function handleNotificationDeepLink(data: NotificationData): DeepLinkConfig | null {
    // Handle nested data structure
    const notificationData = data.data || data;

    if (notificationData.threadId) {
        return {
            path: `/posts/${notificationData.threadId}?subjectName=${encodeURIComponent(notificationData.subjectName || '')}`,
        };
    }

    if (notificationData.badgeName) {
        return {
            path: '/report/[uid]',
            params: {
                uid: notificationData.learnerUid || '',
                name: notificationData.learnerName || ''
            }
        };
    }

    if (notificationData.followerUid) {
        return {
            path: '/(tabs)/social'
        };
    }

    if (notificationData.screen) {
        return {
            path: notificationData.screen as DeepLinkConfig['path']
        };
    }

    return null;
}

export async function registerForPushNotificationsAsync() {
    try {
        let token;

        if (Platform.OS === 'android') {
            try {
                // Ensure Firebase is initialized
                if (!app) {
                    console.error('[PushNotifications] Firebase app not initialized');
                    return null;
                }

                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
            } catch (error) {
                console.error('[PushNotifications] Failed to set up Android notification channel:', error);
                throw error;
            }
        }

        if (Device.isDevice) {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    return null;
                }

                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId: 'b4f9ab87-947e-4014-8990-0c11fa29cb2c'
                    })).data;
                } catch (tokenError) {
                    console.error('[PushNotifications] Failed to get push token:', tokenError);
                    throw tokenError;
                }

                try {
                    await AsyncStorage.setItem('pushToken', token);
                } catch (storageError) {
                    console.error('[PushNotifications] Failed to store push token:', storageError);
                    throw storageError;
                }
                return token;
            } catch (error) {
                console.error('[PushNotifications] Error during permission/token process:', error);
                throw error;
            }
        }

        return null;
    } catch (error) {
        console.error('[PushNotifications] Critical error in registration process:', error);
        return null;
    }
}

export async function getStoredPushToken() {
    try {
        return await AsyncStorage.getItem('pushToken');
    } catch (error) {
        console.error('Error getting stored push token:', error);
        return null;
    }
}

export async function removePushToken() {
    try {
        await AsyncStorage.removeItem('pushToken');
    } catch (error) {
        console.error('Error removing push token:', error);
    }
}