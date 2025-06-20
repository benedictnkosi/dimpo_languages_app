import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  isPremium?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => { throw new Error('AuthContext not initialized'); },
  signUp: async () => { throw new Error('AuthContext not initialized'); },
  signOut: async () => { throw new Error('AuthContext not initialized'); },
});


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    // Attempt to restore from SecureStore first
    async function restoreFromSecureStore() {
      try {
        const storedAuth = await SecureStore.getItemAsync('auth');
        if (storedAuth && !user && isMounted) {
          const { user: storedUser } = JSON.parse(storedAuth);
          setUser(storedUser);
        }
      } catch (error) {
        console.error('Error restoring auth from SecureStore:', error);
      }
    }

    // Then set up Firebase auth listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        const userData: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        };
        // Store in SecureStore as backup
        await SecureStore.setItemAsync('auth', JSON.stringify({ user: userData }));
        setUser(userData);
      } else {
        // Only clear auth if we're sure there's no user
        const storedAuth = await SecureStore.getItemAsync('auth');
        if (!storedAuth) {
          setUser(null);
          await SecureStore.deleteItemAsync('auth');
        }
      }
      setIsLoading(false);
    });

    restoreFromSecureStore();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments.join('/') === 'login';
    const inRegisterScreen = segments.join('/') === 'register';
    const inForgotPasswordScreen = segments.join('/') === 'forgot-password';
    const inOnboardingScreen = segments.join('/') === 'onboarding';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!user && !inLoginScreen && !inRegisterScreen && !inForgotPasswordScreen && !inOnboardingScreen) {
      router.replace('/login');
    } else if (user && (inAuthGroup || inLoginScreen || inRegisterScreen || inForgotPasswordScreen)) {
      router.replace('/(tabs)');
    } else if (!user && inTabsGroup) {
      router.replace('/login');
    }
  }, [user, isLoading, segments]);

  const signOut = async () => {
    await firebaseSignOut(auth);
    await SecureStore.deleteItemAsync('auth');
    setUser(null);
  };

  const signIn = async (email: string, password: string): Promise<AuthUser> => {
    const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
    const userData: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
    return userData;
  };

  const signUp = async (email: string, password: string): Promise<AuthUser> => {
    const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
    const userData: AuthUser = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
    };
    return userData;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 