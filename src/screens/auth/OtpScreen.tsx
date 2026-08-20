import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AuthLayout } from '../../components/AuthLayout';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;

export default function OtpScreen({ onBack }: { onBack: () => void }) {
  const { pendingSignup, verifyOtpAndRegister, resendOtp, loading, error, clearError } = useAuth();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [timeLeft, setTimeLeft] = useState(RESEND_SECONDS);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    clearError();
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = digits.join('');
    if (code.length < OTP_LENGTH) return;
    verifyOtpAndRegister(code).catch(() => setDigits(Array(OTP_LENGTH).fill('')));
  };

  const handleResend = () => {
    if (timeLeft > 0) return;
    resendOtp()
      .then(() => setTimeLeft(RESEND_SECONDS))
      .catch(() => {});
  };

  return (
    <AuthLayout title="Check your email" onBack={onBack}>
      <Text style={styles.subtitle}>
        We&apos;ve sent a {OTP_LENGTH}-digit code to{' '}
        <Text style={styles.email}>{pendingSignup?.email ?? 'your email'}</Text>
      </Text>

      <View style={styles.otpRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={el => {
              inputRefs.current[index] = el;
            }}
            value={digit}
            onChangeText={text => handleChange(index, text)}
            onKeyPress={e => handleKeyPress(index, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            style={styles.otpInput}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color={colors.magenta} style={styles.spinner} />
      ) : (
        <PrimaryButton label="Verify account" onPress={handleVerify} />
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Didn&apos;t receive the code? </Text>
        <Pressable onPress={handleResend} disabled={timeLeft > 0} hitSlop={8}>
          <Text style={[styles.footerLink, timeLeft > 0 && styles.footerLinkDisabled]}>
            {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Resend'}
          </Text>
        </Pressable>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: colors.inkMuted60,
    marginBottom: 20,
  },
  email: {
    fontWeight: '600',
    color: colors.ink,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  otpInput: {
    width: 52,
    height: 58,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: colors.ink,
  },
  error: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.destructive,
    marginBottom: 12,
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
  footerLinkDisabled: {
    color: colors.mutedForeground,
  },
});
