import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

interface ThemeContextType {
    isDark: boolean;
    colors: typeof lightColors;
}

export const lightColors = {
    background: '#FFFFFF',
    surface: '#F8FAFC',
    surfaceHigh: '#F1F5F9',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#64748B',
    primary: '#4F46E5',
    secondary: '#9333EA',
    accent: '#F59E0B',
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#22C55E',
    placeholder: '#94A3B8',
    disabled: '#E2E8F0',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    buttonText: '#FFFFFF',
    link: '#2563EB',
    gradientStart: '#4F46E5',
    gradientEnd: '#9333EA',
};

export const darkColors = {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceHigh: '#334155',
    card: '#1E293B',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    primary: '#6366F1',
    secondary: '#A855F7',
    accent: '#F59E0B',
    border: '#334155',
    error: '#EF4444',
    success: '#22C55E',
    placeholder: '#64748B',
    disabled: '#334155',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    buttonText: '#FFFFFF',
    link: '#60A5FA',
    gradientStart: '#6366F1',
    gradientEnd: '#A855F7',
};

const ThemeContext = createContext<ThemeContextType>({
    isDark: false,
    colors: lightColors,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ isDark, colors }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
} 