import React, { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } from '@react-native-google-signin/google-signin';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { login, googleLogin, getTokenFromResponse } from '@/api/auth';
import { getPostLoginRoute, getSessionFromToken, saveSession, decodeJwtPayload } from '@/lib/session';
import type { AuthSession, ApiRecord } from '@/types/auth';
import type { AuthStackParamList } from '@/app/types';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps as RootNativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/app/types';

type Props = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, 'Login'>,
  RootNativeStackScreenProps<RootStackParamList>
>;

export function LoginScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goToPostLogin = (session: AuthSession) => {
    const route = getPostLoginRoute(session);
    navigation.getParent()?.reset({ index: 0, routes: [{ name: route as keyof RootStackParamList }] });
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await login(email.trim(), password);
      const token = getTokenFromResponse(response);
      if (!token) throw new Error('Token not received from server');
      const session = getSessionFromToken(token, null);
      if (!session) throw new Error('Invalid token payload');
      await saveSession(session);
      goToPostLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) {
        // user cancelled
        return;
      }
      const { user, idToken } = result.data;
      const tokens = await GoogleSignin.getTokens();

      const backendData = (await googleLogin({
        email: user.email,
        name: user.name ?? user.email,
        picture: user.photo ?? undefined,
        googleAccessToken: tokens.accessToken || idToken || '',
      })) as ApiRecord;

      const token = getTokenFromResponse(backendData);
      if (!token) throw new Error('Google login endpoint is unavailable. Please contact support.');

      const decoded = decodeJwtPayload(token);
      const session: AuthSession = {
        email: user.email,
        name: user.name ?? user.email,
        fullName: user.name ?? user.email,
        role: 'user',
        token,
        ts: Date.now(),
        subscription: (decoded?.subscription as string) ?? (decoded?.Subscription as string) ?? 'free',
        ProfilePicture: user.photo ?? undefined,
        profilePicture: user.photo ?? undefined,
        user: decoded ?? undefined,
      };

      await saveSession(session);
      goToPostLogin(session);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        // silent — user backed out
      } else {
        setError(err instanceof Error ? err.message : 'Google login failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>BETA ACCESS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Welcome back</Text>
      </View>

      <Button title="Continue with Google" variant="outline" onPress={handleGoogleLogin} loading={googleLoading} />

      <View style={styles.dividerRow}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Text style={{ color: colors.mutedForeground, fontSize: 11, marginHorizontal: 12 }}>OR EMAIL</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      <Input
        placeholder="you@company.com"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input placeholder="Password" secureTextEntry secureToggle value={password} onChangeText={setPassword} />

      <Text
        style={[styles.link, { color: colors.primary, alignSelf: 'flex-end', marginBottom: 12 }]}
        onPress={() => navigation.navigate('ForgotPassword')}>
        Forgot password?
      </Text>

      {error ? <Text style={{ color: colors.destructive, marginBottom: 12, fontSize: 12 }}>{error}</Text> : null}

      <Button title="Sign in" onPress={handleEmailLogin} loading={loading} disabled={!email || !password} />

      <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 20 }}>
        New to HOLOVOX?{' '}
        <Text style={{ color: colors.primary, fontWeight: '600' }} onPress={() => navigation.navigate('Signup')}>
          Create an account
        </Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 24 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, marginBottom: 6, fontWeight: '600' },
  title: { fontSize: 30, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  link: { fontSize: 12, fontWeight: '600' },
});
