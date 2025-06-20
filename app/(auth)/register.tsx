import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import RegisterForm from '../components/RegisterForm';
import { ThemedText } from '@/components/ThemedText';

export default function RegisterScreen() {
    const params = useLocalSearchParams();
    const onboardingData = {
        curriculum: Array.isArray(params.curriculum) ? params.curriculum[0] : params.curriculum,
        avatar: Array.isArray(params.avatar) ? params.avatar[0] : params.avatar,
    } as const;

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#1B1464', '#2B2F77']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <ThemedText style={styles.title}>Create Account</ThemedText>
                        <ThemedText style={styles.subtitle}>Sign up to start your learning journey!</ThemedText>
                    </View>
                    <RegisterForm onboardingData={onboardingData} />
                </View>
            </LinearGradient>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#E2E8F0',
        textAlign: 'center',
    },
}); 