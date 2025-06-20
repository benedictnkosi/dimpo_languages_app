import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingData } from '../onboarding';
import { analytics } from '@/services/analytics';
import { HOST_URL } from '@/config/api';

interface RegisterFormProps {
    onboardingData: OnboardingData;
    defaultMethod?: RegistrationMethod;
}

type RegistrationMethod = 'email' | 'phone';

export default function RegisterForm({ onboardingData, defaultMethod = 'email' }: RegisterFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [registrationMethod, setRegistrationMethod] = useState<RegistrationMethod>(defaultMethod);
    const { signUp } = useAuth();

    const logAnalyticsEvent = async (eventName: string, params: {
        user_id: string;
        email: string;
        error?: string;
    }) => {
        try {
            await analytics.track(eventName, params);
        } catch (error) {
            console.error('Analytics error:', error);
        }
    };

    const validatePhoneNumber = (phone: string): boolean => {
        return /^\d{10}$/.test(phone);
    };

    const handleRegister = async () => {
        if (!name || !password || !confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill in all fields',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
            return;
        }

        if (registrationMethod === 'phone' && !validatePhoneNumber(phoneNumber)) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a valid 10-digit phone number',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
            return;
        }

        if (registrationMethod === 'email' && !email) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter your email',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
            return;
        }

        if (password.length < 6) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Password must be at least 6 characters',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
            return;
        }

        if (password !== confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Passwords do not match',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
            return;
        }

        setIsLoading(true);
        try {
            const userEmail = registrationMethod === 'phone'
                ? `${phoneNumber}@examquiz.co.za`
                : email;

            // Register the user
            const user = await signUp(userEmail, password);

            // If we have onboarding data, update the learner profile
            if (onboardingData) {
                const learnerData = {
                    name: name,
                    email: userEmail,
                    avatar: onboardingData.avatar,
                };

                // Create new learner
                try {
                    const response = await fetch(`${HOST_URL}/api/language-learners`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            uid: user.uid,
                            name: learnerData.name,
                            email: learnerData.email,
                            points: 0,
                            streak: 0,
                            avatar: learnerData.avatar,
                            expoPushToken: '', // This can be updated later when we get the push token
                            followMeCode: '', // This will be generated by the backend
                            version: '1.0.0',
                            os: Platform.OS,
                            reminders: true
                        }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to create learner profile');
                    }

                    const learnerResponse = await response.json();
                    console.log('Learner created:', learnerResponse);
                } catch (error) {
                    console.error('Error creating learner:', error);
                    // Don't throw here as the user is already registered
                    // Just log the error and continue
                }
            }

            // Store auth token
            await SecureStore.setItemAsync('auth', JSON.stringify({ user }));

            await logAnalyticsEvent('register_success', {
                user_id: user.uid,
                email: userEmail,
            });

            // Show success toast
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Account created successfully!',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });

            // Navigate to tabs
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Registration error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create account',
                position: 'bottom',
                visibilityTime: 3000,
                autoHide: true,
                topOffset: 30,
                bottomOffset: 40
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateGmail = () => {
        setRegistrationMethod('phone');
    };

    return (
        <View style={styles.container} testID="register-form-container">
            <View style={styles.registrationMethodContainer}>
                <TouchableOpacity
                    style={[
                        styles.methodButton,
                        registrationMethod === 'email' && styles.methodButtonActive
                    ]}
                    onPress={() => setRegistrationMethod('email')}
                >
                    <ThemedText style={[
                        styles.methodButtonText,
                        registrationMethod === 'email' && styles.methodButtonTextActive
                    ]}>
                        Email
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.methodButton,
                        registrationMethod === 'phone' && styles.methodButtonActive
                    ]}
                    onPress={() => setRegistrationMethod('phone')}
                >
                    <ThemedText style={[
                        styles.methodButtonText,
                        registrationMethod === 'phone' && styles.methodButtonTextActive
                    ]}>
                        Phone
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                testID="name-input"
                maxLength={50}
                accessibilityLabel="Full name input"
            />

            {registrationMethod === 'email' ? (
                <>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        testID="email-input"
                        maxLength={50}
                        accessibilityLabel="Email input"
                    />
                    <TouchableOpacity
                        onPress={handleCreateGmail}
                        style={styles.gmailLink}
                        accessibilityLabel="Use phone number instead"
                    >
                        <ThemedText style={styles.gmailLinkText}>
                            Don't have an email? Use your phone number
                        </ThemedText>
                    </TouchableOpacity>
                </>
            ) : (
                <TextInput
                    style={styles.input}
                    placeholder="Phone Number (10 digits)"
                    placeholderTextColor="#94A3B8"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    testID="phone-input"
                    maxLength={10}
                    accessibilityLabel="Phone number input"
                />
            )}

            <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        testID="password-input"
                        maxLength={50}
                        accessibilityLabel="Password input"
                    />
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        testID="toggle-password-visibility"
                    >
                        <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={24}
                            color="#94A3B8"
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.passwordContainer}>
                <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    testID="confirm-password-input"
                    maxLength={50}
                    accessibilityLabel="Confirm password input"
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    testID="toggle-confirm-password-visibility"
                >
                    <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={24}
                        color="#94A3B8"
                    />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                testID="register-button"
                accessibilityLabel="Create account button"
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" testID="register-loading-indicator" />
                ) : (
                    <ThemedText style={styles.buttonText} testID="register-button-text">Create Account</ThemedText>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    registrationMethodContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 4,
    },
    methodButton: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    methodButtonActive: {
        backgroundColor: '#4F46E5',
    },
    methodButtonText: {
        color: '#94A3B8',
        fontSize: 16,
        fontWeight: '600',
    },
    methodButtonTextActive: {
        color: '#FFFFFF',
    },
    inputContainer: {
        marginBottom: 16,
    },
    passwordContainer: {
        position: 'relative',
        width: '100%',
        marginBottom: 16,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 4,
        color: '#FFFFFF',
        fontSize: 16,
    },
    passwordInput: {
        paddingRight: 50,
        marginBottom: 0,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 4,
    },
    helperText: {
        fontSize: 14,
        color: '#94A3B8',
        marginLeft: 4,
        marginTop: 4,
    },
    button: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    gmailLink: {
        marginBottom: 16,
        padding: 8,
    },
    gmailLinkText: {
        color: '#FFFFFF',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
