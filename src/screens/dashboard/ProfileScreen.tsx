import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { fetchUserProfile, changePassword, type RemoteUserProfile } from '@/api/profile';

export function ProfileScreen() {
  const { colors, radius: r } = useTheme();
  const { userId, token, email, name } = useCurrentUser();
  const [profile, setProfile] = useState<RemoteUserProfile | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId || !token) return;
    fetchUserProfile(userId, token).then(setProfile).catch(() => setProfile(null));
  }, [userId, token]);

  const hasPassword = profile?.hasPassword !== false;
  const initials = String(name || email || 'U')
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const handleChangePassword = async () => {
    if (hasPassword && !currentPassword) {
      Alert.alert('Missing field', 'Current password is required');
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Check your new password and confirmation.');
      return;
    }
    if (!userId || !token) return;
    setSaving(true);
    try {
      await changePassword(userId, token, { currentPassword: hasPassword ? currentPassword : undefined, newPassword });
      Alert.alert('Success', hasPassword ? 'Password updated.' : 'Password set.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{profile?.fullName || name}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{profile?.email || email}</Text>
        {/* Avatar upload needs a native image picker + multipart upload — deferred to a
            follow-up so this isn't wired to a picker that doesn't exist yet. */}
      </View>

      <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {hasPassword ? 'Change password' : 'Set a password'}
        </Text>
        {hasPassword ? (
          <Input placeholder="Current password" secureTextEntry secureToggle value={currentPassword} onChangeText={setCurrentPassword} />
        ) : null}
        <Input placeholder="New password" secureTextEntry secureToggle value={newPassword} onChangeText={setNewPassword} />
        <Input placeholder="Confirm new password" secureTextEntry secureToggle value={confirmPassword} onChangeText={setConfirmPassword} />
        <Button title={hasPassword ? 'Update password' : 'Set password'} onPress={handleChangePassword} loading={saving} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700' },
  section: { borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
});
