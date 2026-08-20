import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthLayout } from '../../components/AuthLayout';
import { GoogleButton } from '../../components/GoogleButton';
import { Divider } from '../../components/Divider';
import { AuthInput, PasswordInput } from '../../components/AuthInput';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

export default function SignInScreen({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const { signIn, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!email || !password) return;
    signIn(email, password).catch(() => {});
  };

  return (
    <AuthLayout title="Welcome back">
      <GoogleButton />

      <Divider label="or email" />

      <View style={styles.form}>
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

        <Pressable style={styles.forgotWrap} hitSlop={8}>
          <Text style={styles.forgotLabel}>Forgot password?</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator color={colors.magenta} style={styles.spinner} />
        ) : (
          <PrimaryButton label="Sign in" onPress={handleSubmit} />
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to HOLOVOX? </Text>
        <Pressable onPress={onSwitchToSignUp} hitSlop={8}>
          <Text style={styles.footerLink}>Create an account</Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 12,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgotLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.magenta,
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
