import { useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email address',
        position: 'bottom'
      });
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      Toast.show({
        type: 'success',
        text1: 'Reset Email Sent',
        text2: 'Check your email for password reset instructions',
        position: 'bottom'
      });
      router.replace('/login');
    } catch (error: any) {
      console.error('Password reset error:', error);
      const messages: { [key: string]: string } = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-not-found': 'No account found with this email'
      };
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: messages[error.code] || 'Failed to send reset email',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B1464', '#2B2F77']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>Reset Password 🔐</ThemedText>
            <ThemedText style={styles.subtitle}>
              Don't worry! It happens to the best of us. Let's get you back in! 🚀
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Sending Reset Link...' : 'Reset Password →'}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.backToLoginContainer}>
              <ThemedText style={styles.helperText}>
                Remember your password? Great! Let's get you back in! 😊
              </ThemedText>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.replace('/login')}
              >
                <ThemedText style={styles.linkText}>Back to Login</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
    width: '100%',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    width: '100%',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 20,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#1B1464',
    fontSize: 18,
    fontWeight: '600',
  },
  backToLoginContainer: {
    marginTop: 32,
    alignItems: 'center',
  },
  helperText: {
    color: '#E2E8F0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  linkButton: {
    padding: 8,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
}); 