import { Stack } from 'expo-router';
import { StyleSheet, Image, View, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '../components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import React from 'react';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <LinearGradient
        colors={['#FFFFFF', '#FFFFFF']}
        style={styles.gradient}
      >
       <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={[styles.loadingText, { color: colors.text }]}>Loading ...</ThemedText>
          </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  loadingGif: {
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 18,
    textDecorationLine: 'underline',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
  }
});
