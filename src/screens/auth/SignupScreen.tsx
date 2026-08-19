import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { sendOtp } from '@/api/auth';
import { savePendingSignup } from '@/lib/session';
import type { AuthStackParamList } from '@/app/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await savePendingSignup({ fullName, email: email.trim(), password, role: 'user' });
      await sendOtp(email.trim());
      navigation.navigate('Otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>BETA ACCESS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Join HOLOVOX</Text>
      </View>

      <Input placeholder="Full name" value={fullName} onChangeText={setFullName} />
      <Input
        placeholder="you@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input placeholder="Password" secureTextEntry secureToggle value={password} onChangeText={setPassword} />

      {error ? <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12 }}>{error}</Text> : null}

      <Button
        title="Create account"
        onPress={handleSubmit}
        loading={loading}
        disabled={!fullName || !email || password.length < 6}
      />

      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>
        Already have an account?{' '}
        <Text style={{ color: colors.primary, fontWeight: '600' }} onPress={() => navigation.navigate('Login')}>
          Sign in
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, marginBottom: 6, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800' },
});
