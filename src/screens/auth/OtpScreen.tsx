import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { sendOtp, verifyOtp, signUp, getTokenFromResponse } from '@/api/auth';
import { clearPendingSignup, loadPendingSignup, saveSession } from '@/lib/session';
import type { AuthStackParamList } from '@/app/types';
import type { PendingSignupPayload } from '@/types/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;
const OTP_LENGTH = 4;

export function OtpScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [pending, setPending] = useState<PendingSignupPayload | null>(null);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    loadPendingSignup().then((data) => {
      if (!data) {
        navigation.navigate('Signup');
        return;
      }
      setPending(data);
    });
  }, [navigation]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputs.current[index - 1]?.focus();
  };

  const handleResend = async () => {
    if (!pending || timeLeft > 0) return;
    try {
      await sendOtp(pending.email);
      setTimeLeft(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send OTP');
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (!pending || code.length < OTP_LENGTH) {
      setError('Enter the complete OTP');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(pending.email, code);
      const registerResponse = await signUp(pending.fullName, pending.email, pending.password);
      const token = getTokenFromResponse(registerResponse);
      if (!token) throw new Error('Registration succeeded but no token returned');

      await saveSession({
        email: pending.email,
        name: pending.fullName,
        role: pending.role,
        token,
        ts: Date.now(),
      });
      await clearPendingSignup();
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
        We've sent a {OTP_LENGTH}-digit code to {pending?.email ?? 'your email'}
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(el) => {
              inputs.current[index] = el;
            }}
            value={digit}
            onChangeText={(v) => handleChange(index, v)}
            onKeyPress={(e) => handleKeyPress(index, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={1}
            style={[
              styles.otpBox,
              { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
            ]}
          />
        ))}
      </View>

      {error ? <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12 }}>{error}</Text> : null}

      <Button title="Verify account" onPress={handleSubmit} loading={loading} disabled={otp.join('').length < OTP_LENGTH} />

      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>
        Didn't receive the code?{' '}
        <Text
          style={{ color: timeLeft > 0 ? colors.mutedForeground : colors.primary, fontWeight: '600' }}
          onPress={handleResend}>
          {timeLeft > 0 ? `Resend in ${timeLeft}s` : 'Click to resend'}
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 24 },
  otpBox: {
    width: 52,
    height: 60,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
  },
});
