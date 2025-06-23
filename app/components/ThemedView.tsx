import React from 'react';
import { View, ViewProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedViewProps extends ViewProps {
    children: React.ReactNode;
}

export function ThemedView({ style, children, ...props }: ThemedViewProps) {
    const { isDark } = useTheme();
    
    return (
        <View
            style={[
                {
                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}

export default ThemedView; 