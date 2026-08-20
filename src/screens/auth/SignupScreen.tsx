import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '../../components/AuthLayout';
import { GoogleButton } from '../../components/GoogleButton';
import { Divider } from '../../components/Divider';
import { AuthInput, PasswordInput } from '../../components/AuthInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function SignUpScreen({
  onSwitchToSignIn,
  onOtpSent,
}: {
  onSwitchToSignIn: () => void;
  onOtpSent: () => void;
}) {
  const { startSignUp, loading, error, clearError } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!name || !email || password.length < 6) return;
    startSignUp(name, email, password)
      .then(onOtpSent)
      .catch(() => {});
  };

  return (
    <AuthLayout title="Join HOLOVOX" onBack={onSwitchToSignIn}>
      <GoogleButton />

      <Divider label="or email" />

      <View style={styles.form}>
        <AuthInput
          placeholder="Full name"
          value={name}
          onChangeText={text => {
            setName(text);
            clearError();
          }}
        />
        <AuthInput
          placeholder="you@company.com"
          value={email}
          onChangeText={text => {
            setEmail(text);
            clearError();
          }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <PasswordInput
          placeholder="Password"
          value={password}
          onChangeText={text => {
            setPassword(text);
            clearError();
          }}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.magenta} style={styles.spinner} />
        ) : (
          <PrimaryButton label="Create account" onPress={handleSubmit} />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={onSwitchToSignIn} hitSlop={8}>
          <Text style={styles.footerLink}>Sign in</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  error: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.destructive,
  },
  spinner: {
    paddingVertical: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
  footerLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.magenta,
  },
});
