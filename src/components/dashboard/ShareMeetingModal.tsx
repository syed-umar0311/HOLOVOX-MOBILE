import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';

export function ShareMeetingModal({
  visible,
  meetingTitle,
  isSharing,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  meetingTitle?: string;
  isSharing: boolean;
  onClose: () => void;
  onSubmit: (emails: string[]) => void;
}) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const emails = text
      .split(/[,\s]+/)
      .map(e => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    onSubmit(emails);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Icon name="close" size={13} color={colors.inkMuted60} />
          </Pressable>

          <Text style={styles.eyebrow}>Share meeting</Text>
          <Text style={styles.title}>{meetingTitle ?? 'Send an invite'}</Text>
          <Text style={styles.subtitle}>Enter email addresses separated by commas.</Text>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="alex@company.com, sam@company.com"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
            multiline
            style={styles.input}
          />

          <Pressable style={[styles.submit, isSharing && styles.submitDisabled]} onPress={handleSubmit} disabled={isSharing}>
            {isSharing ? <ActivityIndicator color={colors.card} size="small" /> : <Text style={styles.submitLabel}>Send invite</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 27, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 26,
    backgroundColor: colors.canvas,
    padding: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkMuted40,
  },
  title: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: colors.inkMuted60,
  },
  input: {
    marginTop: 16,
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    padding: 12,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: 16,
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    backgroundColor: colors.inkMuted40,
  },
  submitLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
  },
});
