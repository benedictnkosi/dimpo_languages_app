import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../../config/firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';

export interface User {
    uid: string;
    email: string | null;
    displayName?: string | null;
    photoURL?: string | null;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<User>;
    signUp: (email: string, password: string) => Promise<User>;
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
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userData: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                };
                await SecureStore.setItemAsync('auth', JSON.stringify({ user: userData }));
                setUser(userData);
            } else {
                await SecureStore.deleteItemAsync('auth');
                setUser(null);
            }
            setIsLoading(false);
        });

        return unsubscribe;
    }, []);

    const signIn = async (email: string, password: string): Promise<User> => {
        const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password);
        const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
        };
        return userData;
    };

    const signUp = async (email: string, password: string): Promise<User> => {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
        const userData: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
        };
        return userData;
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        await SecureStore.deleteItemAsync('auth');
        setUser(null);
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