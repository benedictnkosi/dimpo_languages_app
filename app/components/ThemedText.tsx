import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
    children: React.ReactNode;
}

export function ThemedText({ style, children, ...props }: ThemedTextProps) {
    const { isDark } = useTheme();
    
    return (
        <Text
            style={[
                {
                    color: isDark ? '#FFFFFF' : '#000000',
                },
                style,
            ]}
            {...props}
        >
            {children}
        </Text>
    );
} 