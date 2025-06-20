import { router } from 'expo-router';

export default function AuthNavigation() {
  return null;
}

export function useAuthNavigation() {
  return {
    navigateToLogin: () => router.replace('/login'),
    navigateToHome: () => router.replace('/(tabs)'),
  };
} 