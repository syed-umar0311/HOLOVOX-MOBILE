import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { forgotPassword, resetPassword } from '@/api/auth';
import { clearPendingReset, loadPendingReset } from '@/lib/session';
import type { AuthStackParamList } from '@/app/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;
const OTP_LENGTH = 6;

export function ResetPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    loadPendingReset().then((pendingEmail) => {
      if (!pendingEmail) {
        navigation.navigate('ForgotPassword');
        return;
      }
      setEmail(pendingEmail);
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
    if (!email || timeLeft > 0) return;
    try {
      await forgotPassword(email);
      setTimeLeft(30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset code');
    }
  };

  const handleSubmit = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError('Enter the complete reset code');
      return;
    }
    if (!email) {
      navigation.navigate('ForgotPassword');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPassword(email, code, newPassword, confirmPassword);
      await clearPendingReset();
      navigation.getParent()?.navigate('Auth', { screen: 'Login' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: colors.foreground, fontSize: 26, fontWeight: '800', marginBottom: 8 }}>
        Reset your password
      </Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 20 }}>
        We've sent a {OTP_LENGTH}-digit code to {email ?? 'your email'}
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

      <Input placeholder="New password" secureTextEntry secureToggle value={newPassword} onChangeText={setNewPassword} />
      <Input
        placeholder="Confirm new password"
        secureTextEntry
        secureToggle
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      {error ? <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12 }}>{error}</Text> : null}

      <Button title="Reset password" onPress={handleSubmit} loading={loading} disabled={otp.join('').length < OTP_LENGTH} />

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
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  otpBox: {
    width: 42,
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
});
