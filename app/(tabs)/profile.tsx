import { UpgradeToProButton } from '@/app/components/UpgradeToProButton';
import { Header } from '@/components/Header';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Paywall } from '../components/Paywall';
import { useSound } from '../contexts/SoundContext';

interface ProfileInfo {
  name: string;
  email?: string;
  subscription?: 'free' | 'premium';
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ title: '', message: '' });
  const insets = useSafeAreaInsets();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);

  const fetchLearnerData = async () => {
    try {
      const authData = await SecureStore.getItemAsync('auth');
      if (!authData) {
        throw new Error('No auth data found');
      }
      const { user } = JSON.parse(authData);

      const response = await fetch(`${HOST_URL}/api/language-learners/uid/${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch learner data');
      }

      const learnerData = await response.json();
      setProfileInfo({
        name: learnerData.name,
        email: user?.email || '',
        subscription: learnerData.subscription || 'free'
      });
      setEditName(learnerData.name);

      //console.log('subscription', learnerData.subscription);
    } catch (error) {
      console.error('Error fetching learner data:', error);
    }
  };

  useEffect(() => {
    fetchLearnerData();
  }, [user?.email]);

  const handleSave = async () => {
    await saveChanges();
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const authData = await SecureStore.getItemAsync('auth');
      if (!authData) {
        throw new Error('No auth data found');
      }
      const { user } = JSON.parse(authData);

      const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
        }),
      });

      //console.log('response', response);

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfileInfo(prev => ({
        ...prev!,
        name: updatedProfile.name,
      }));

      Toast.show({
        type: 'success',
        text1: 'Profile updated successfully',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        autoHide: true
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        autoHide: true
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to logout',
        position: 'bottom'
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;

    setIsDeleting(true);
    try {
      // Mock successful deletion
      Toast.show({
        type: 'info',
        text1: 'Account deleted successfully',
        position: 'bottom'
      });

      setTimeout(async () => {
        await signOut();
      }, 3000);
    } catch (error) {
      console.error('Error deleting account:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete account',
        position: 'bottom'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
        //console.log('Clearing cached resources...');
        const audioDir = `${FileSystem.documentDirectory}audio`;
        const imageDir = `${FileSystem.documentDirectory}image`;

        const audioDirInfo = await FileSystem.getInfoAsync(audioDir);
        if (audioDirInfo.exists) {
            await FileSystem.deleteAsync(audioDir, { idempotent: true });
            //console.log('Cleared audio cache.');
        }

        const imageDirInfo = await FileSystem.getInfoAsync(imageDir);
        if (imageDirInfo.exists) {
            await FileSystem.deleteAsync(imageDir, { idempotent: true });
            //console.log('Cleared image cache.');
        }
        
        Toast.show({
            type: 'success',
            text1: 'Cache cleared successfully',
            position: 'bottom'
        });

    } catch (error) {
        console.error('Error clearing cache:', error);
        Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Failed to clear cache',
            position: 'bottom'
        });
    } finally {
        setIsClearingCache(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={styles.container}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        <Header/>

        <ThemedView style={styles.content}>
          <ThemedView style={[styles.profileCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>Name</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={isDark ? colors.textSecondary : '#94A3B8'}
                  maxLength={50}
                />
                <ThemedText style={[styles.email, { color: colors.textSecondary, marginTop: 8 }]}>
                  {user?.email}
                </ThemedText>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  { backgroundColor: colors.primary }
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <ThemedText style={styles.buttonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Sound Settings Card */}
          <ThemedView style={[styles.settingsCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <ThemedText style={[styles.settingsTitle, { color: colors.text }]}>
              🔊 Sound Settings
            </ThemedText>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={[styles.settingLabel, { color: colors.text }]}>
                  Play Sound Effects
                </ThemedText>
                <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Hear feedback sounds when answering questions
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  {
                    backgroundColor: soundEnabled ? colors.primary : isDark ? colors.surface : '#E5E7EB',
                    borderColor: colors.border,
                  }
                ]}
                onPress={toggleSound}
                accessibilityRole="switch"
                accessibilityState={{ checked: soundEnabled }}
                accessibilityLabel={`Sound effects ${soundEnabled ? 'enabled' : 'disabled'}`}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    {
                      backgroundColor: '#FFFFFF',
                      transform: [{ translateX: soundEnabled ? 20 : 0 }],
                    }
                  ]}
                />
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Show Upgrade to Pro button for free users */}
          {profileInfo?.subscription === 'free' && (
            <ThemedView style={[styles.upgradeCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
              <ThemedText style={[styles.upgradeTitle, { color: colors.text }]}>
                ✨ Unlock Premium Features
              </ThemedText>
              <ThemedText style={[styles.upgradeDescription, { color: colors.textSecondary }]}>
                Get unlimited access to all lessons!
              </ThemedText>
              <UpgradeToProButton
                style={styles.upgradeButton}
                onPress={() => {
                  setIsUpgradeLoading(true);
                  setShowPaywall(true);
                }}
                loading={isUpgradeLoading}
              />
            </ThemedView>
          )}
        </ThemedView>

        <ThemedView style={styles.signOutContainer}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => router.push('/(tabs)')}
              disabled={isLoggingOut}
            >
              <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>
                Close
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#DC2626' : '#F43F5E' },
                isLoggingOut && styles.buttonDisabled
              ]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.deleteAccountButton,
              {
                backgroundColor: isDark ? colors.surface : '#F1F5F9',
                borderColor: isDark ? colors.border : '#E2E8F0',
              },
              (isClearingCache || isLoggingOut) && styles.buttonDisabled
            ]}
            onPress={handleClearCache}
            disabled={isClearingCache || isLoggingOut}
          >
            <ThemedText style={[styles.deleteAccountText, { color: isDark ? colors.textSecondary : '#475569' }]}>
              {isClearingCache ? 'Clearing...' : 'Clear Downloaded Resources'}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.deleteAccountButton,
              {
                backgroundColor: isDark ? colors.surface : '#FEE2E2',
                borderColor: '#DC2626'
              },
              isLoggingOut && styles.buttonDisabled
            ]}
            onPress={() => setShowDeleteModal(true)}
            disabled={isLoggingOut}
          >
            <ThemedText style={[styles.deleteAccountText, { color: '#DC2626' }]}>
              Delete Account
            </ThemedText>
          </TouchableOpacity>

          {/* DEV ONLY: Button to clear AsyncStorage and SecureStore */}
          {process.env.NODE_ENV === 'development' && (
            <View style={{ flexDirection: 'row', gap: 8, margin: 16 }}>
              <TouchableOpacity
                style={{ backgroundColor: '#ef4444', padding: 10, borderRadius: 8, flex: 1 }}
                onPress={async () => {
                  await AsyncStorage.clear();
                  Alert.alert('AsyncStorage cleared');
                }}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                  Clear AsyncStorage (DEV)
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#f59e42', padding: 10, borderRadius: 8, flex: 1 }}
                onPress={async () => {
                  await SecureStore.deleteItemAsync('dailyLessonCount');
                  Alert.alert('SecureStore daily limit cleared');
                }}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>
                  Clear Daily Limit (DEV)
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ThemedView>
      </ScrollView>

      {showPaywall && (
        <Paywall
          onSuccess={() => {
            setShowPaywall(false);
            setIsUpgradeLoading(false);
            // Refresh profile data after successful upgrade
            fetchLearnerData();
          }}
          onClose={() => {
            setShowPaywall(false);
            setIsUpgradeLoading(false);
          }}
        />
      )}

      <Modal
        isVisible={showDeleteModal}
        onBackdropPress={() => setShowDeleteModal(false)}
        style={styles.modal}
      >
        <View style={[styles.confirmationModal, {
          backgroundColor: isDark ? colors.card : '#FFFFFF'
        }]}>
          <View style={styles.confirmationHeader}>
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>Delete Account?</ThemedText>
          </View>
          <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
            This action cannot be undone. All your data will be permanently deleted.
          </ThemedText>

          <View style={styles.deleteConfirmationContainer}>
            <ThemedText style={[styles.deleteConfirmationText, { color: colors.textSecondary }]}>
              Type <ThemedText style={[styles.deleteConfirmationHighlight, { color: '#DC2626' }]}>delete</ThemedText> to confirm
            </ThemedText>
            <TextInput
              style={[styles.deleteConfirmationInput, {
                backgroundColor: isDark ? colors.surface : '#F8FAFC',
                borderColor: colors.border,
                color: colors.text
              }]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type 'delete'"
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.paperButton]}
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
            >
              <LinearGradient
                colors={isDark ? ['#475569', '#334155'] : ['#64748B', '#475569']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>Cancel</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paperButton,
                deleteConfirmation !== 'delete' && styles.paperButtonDisabled
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'delete'}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    backgroundColor: 'transparent',
  },
  profileCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCardHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1,
  },
  editForm: {
    width: '100%',
    gap: 16,
    marginTop: 16,
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    marginVertical: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: '100%',
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutContainer: {
    padding: 20,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  confirmationHeader: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 8,
  },
  paperButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    maxWidth: 160,
  },
  paperButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  paperButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  deleteAccountButton: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmationContainer: {
    marginVertical: 16,
    width: '100%',
  },
  deleteConfirmationText: {
    fontSize: 14,
    marginBottom: 8,
  },
  deleteConfirmationHighlight: {
    fontWeight: '600',
  },
  deleteConfirmationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },
  paperButtonDisabled: {
    opacity: 0.5,
  },
  upgradeCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeDescription: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  upgradeButton: {
    marginHorizontal: 0,
    marginVertical: 0,
  },
  settingsCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
  },
  toggleButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    width: 48,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonDisabled: {
    opacity: 0.5,
  },
  toggleButtonChecked: {
    backgroundColor: '#DC2626',
  },
  toggleThumbChecked: {
    transform: [{ translateX: 20 }],
  },
}); 