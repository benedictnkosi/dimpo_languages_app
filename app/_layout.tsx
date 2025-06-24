import { app } from '@/config/firebase';
import { AuthProvider } from '@/contexts/AuthContext';
import { RevenueCatProvider } from '@/contexts/RevenueCatContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { handleNotificationDeepLink, registerForPushNotificationsAsync } from '@/services/notifications';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { router, SplashScreen, Stack } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { LogBox, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import AuthLayout from './_auth';
import { SoundProvider } from './contexts/SoundContext';

// Suppress shadow warnings
LogBox.ignoreLogs([
  'has a shadow set but cannot calculate shadow efficiently',
]);

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Toast configuration
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#4CAF50', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1B1464'
      }}
      text2Style={{
        fontSize: 14,
        color: '#666666'
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#DC2626', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1B1464'
      }}
      text2Style={{
        fontSize: 14,
        color: '#666666'
      }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#3B82F6', backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1B1464'
      }}
      text2Style={{
        fontSize: 14,
        color: '#666666'
      }}
    />
  )
};

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <AuthProvider>
      <RevenueCatProvider>
        <SoundProvider>
          <AuthLayout />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background }
            }}
          >
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="lessons"
              options={{
                headerShown: false,
                presentation: 'card'
              }}
            />

            <Stack.Screen
              name="profile"
              options={{
                headerShown: false,
                presentation: 'modal'
              }}
            />
          </Stack>
          <Toast config={toastConfig} />
        </SoundProvider>
      </RevenueCatProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  //console.log('[ENTRY] RootLayout rendered');
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    //console.log('[Notifications] useEffect');

    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize notifications when app starts
    async function initializeNotifications() {
      try {
        //console.log('[Notifications] Initializing notifications...');

        // Ensure Firebase is initialized
        if (!app) {
          console.error('[Notifications] Firebase app not initialized');
          return;
        }

        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          //console.log('[Notifications] Successfully registered for push notifications');
        }

        // Set up notification listeners
        notificationListener.current = Notifications.addNotificationReceivedListener(
          (notification: Notifications.Notification) => {
            //console.log('[Notifications] Received notification:', notification);
          }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response: Notifications.NotificationResponse) => {
            const data = response.notification.request.content.data;
            //console.log('[Notifications] Full notification response:', JSON.stringify(response, null, 2));
            //console.log('[Notifications] Notification data:', JSON.stringify(data, null, 2));

            // Handle deep linking
            const deepLink = handleNotificationDeepLink(data);
            //console.log('[Notifications] Generated deep link:', JSON.stringify(deepLink, null, 2));

            if (deepLink) {
              //console.log('[Notifications] Navigating to:', deepLink.path, 'with params:', deepLink.params);
              router.push(deepLink.path as any, deepLink.params);
            }
          }
        );

        // Cleanup listeners on unmount
        return () => {
          if (notificationListener.current) {
            Notifications.removeNotificationSubscription(notificationListener.current);
          }
          if (responseListener.current) {
            Notifications.removeNotificationSubscription(responseListener.current);
          }
        };
      } catch (error) {
        console.error('[Notifications] Error initializing notifications:', error);
      }
    }

    initializeNotifications();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

