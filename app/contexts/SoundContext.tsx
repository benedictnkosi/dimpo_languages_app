import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface SoundContextType {
    soundEnabled: boolean;
    toggleSound: () => void;
    setSoundEnabled: (enabled: boolean) => void;
}

const SoundContext = createContext<SoundContextType>({
    soundEnabled: true,
    toggleSound: () => {},
    setSoundEnabled: () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
    const [soundEnabled, setSoundEnabledState] = useState(true);

    // Load sound setting from AsyncStorage on mount
    useEffect(() => {
        loadSoundSetting();
    }, []);

    const loadSoundSetting = async () => {
        try {
            const stored = await AsyncStorage.getItem('soundEnabled');
            if (stored !== null) {
                setSoundEnabledState(JSON.parse(stored));
            }
        } catch (error) {
            console.error('Error loading sound setting:', error);
        }
    };

    const setSoundEnabled = async (enabled: boolean) => {
        try {
            await AsyncStorage.setItem('soundEnabled', JSON.stringify(enabled));
            setSoundEnabledState(enabled);
        } catch (error) {
            console.error('Error saving sound setting:', error);
        }
    };

    const toggleSound = () => {
        setSoundEnabled(!soundEnabled);
    };

    return (
        <SoundContext.Provider value={{ soundEnabled, toggleSound, setSoundEnabled }}>
            {children}
        </SoundContext.Provider>
    );
}

export const useSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useSound must be used within a SoundProvider');
    }
    return context;
}; 