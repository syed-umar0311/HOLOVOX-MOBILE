import React, { useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { forgotPassword } from '@/api/auth';
import { savePendingReset } from '@/lib/session';
import type { AuthStackParamList } from '@/app/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      await savePendingReset(email.trim());
      navigation.navigate('ResetPassword');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={{ color: colors.foreground, fontSize: 28, fontWeight: '800', marginBottom: 8 }}>
        Forgot password
      </Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 24 }}>
        Enter your email and we'll send you a reset code.
      </Text>

      <Input placeholder="you@company.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

      {error ? <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12 }}>{error}</Text> : null}

      <Button title="Send reset code" onPress={handleSubmit} loading={loading} disabled={!email} />

      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>
        Remembered your password?{' '}
        <Text style={{ color: colors.primary, fontWeight: '600' }} onPress={() => navigation.navigate('Login')}>
          Sign in
        </Text>
      </Text>
    </Screen>
  );
}
