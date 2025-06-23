import { useTheme } from '@/contexts/ThemeContext';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text, useColorScheme } from 'react-native';

import { HapticTab } from '../../components/HapticTab';
import TabBarBackground from '../../components/ui/TabBarBackground';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderTopColor: isDark ? colors.border : '#E5E7EB',
          height: 60
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        ...Platform.select({
          ios: {
            position: 'absolute',
          },
          default: {},
        }),
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
      }}>
        <Tabs.Screen
        name="scoreboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>🏆</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>📖</Text>
          ),
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
