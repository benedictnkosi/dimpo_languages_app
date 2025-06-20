import { useEffect, useState } from 'react';
import { useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export function useProtectedRoute() {
  const { user } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    async function checkProfile() {
      if (!user?.uid) return;
    }

    checkProfile();
  }, [user]);

}

export default function AuthLayout() {
  useProtectedRoute();
  return null;
} 