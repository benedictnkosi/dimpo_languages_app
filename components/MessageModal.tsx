import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Message } from '@/services/api';

interface MessageModalProps {
  visible: boolean;
  message: Message | null;
  onDismiss: () => void;
}

export function MessageModal({ visible, message, onDismiss }: MessageModalProps) {
  const { colors, isDark } = useTheme();

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <ThemedText style={[styles.title, { color: colors.text }]}>
            {message.title}
          </ThemedText>
          <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
            {message.message}
          </ThemedText>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
          >
            <ThemedText style={styles.buttonText}>Got it!</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 