import React from 'react';
import { Text, TextProps } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemedTextProps extends TextProps {
  type?: 'default' | 'title' | 'secondary';
}

export function ThemedText({ style, type = 'default', ...props }: ThemedTextProps) {
  const { colors } = useTheme();

  const getTextColor = () => {
    switch (type) {
      case 'secondary':
        return colors.textSecondary;
      case 'title':
        return colors.text;
      default:
        return colors.text;
    }
  };

  return (
    <Text
      style={[
        {
          color: getTextColor(),
          fontSize: type === 'title' ? 20 : 16,
          fontWeight: type === 'title' ? '600' : '400',
        },
        style,
      ]}
      {...props}
    />
  );
}
