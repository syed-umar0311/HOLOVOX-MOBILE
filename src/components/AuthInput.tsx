import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors } from '../theme/colors';

export function AuthInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      style={styles.input}
      {...props}
    />
  );
}

export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordWrap}>
      <TextInput
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={!visible}
        style={[styles.input, styles.passwordInput]}
        {...props}
      />
      <Pressable style={styles.eyeButton} onPress={() => setVisible(v => !v)} hitSlop={8}>
        <Text style={styles.eyeLabel}>{visible ? 'Hide' : 'Show'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
  },
  passwordWrap: {
    width: '100%',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 56,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
  },
  eyeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
});
