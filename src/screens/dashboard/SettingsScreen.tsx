import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Button } from '@/components/ui/Button';
import { clearSession } from '@/lib/session';
import { fetchBilling, startFreeTrial, type BillingData } from '@/api/settings';

// Simplified from web's tabbed sidebar (Notifications / Recording / Language / Security /
// Billing / Recycle Bin) into one scroll of sections — a sidebar-of-tabs layout doesn't
// fit a phone screen the way it does a desktop dashboard. Sign-out and billing are wired
// to the real endpoints; notification toggles are local-only on web too (no persistence
// endpoint exists there either).
export function SettingsScreen() {
  const { colors } = useTheme();
  const { userId, token, subscription } = useCurrentUser();
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [startingTrial, setStartingTrial] = useState(false);
  const [notifyDigest, setNotifyDigest] = useState(true);
  const [notifyTasks, setNotifyTasks] = useState(true);

  useEffect(() => {
    if (!userId || !token) return;
    fetchBilling(userId, token).then(setBilling).catch(() => setBilling(null));
  }, [userId, token]);

  const handleStartTrial = async () => {
    if (!userId || !token) return;
    setStartingTrial(true);
    try {
      await startFreeTrial(userId, token);
      Alert.alert('Trial started', 'Your Spark trial is now active.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start trial');
    } finally {
      setStartingTrial(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => clearSession() },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 20 }}>Tune Holo to fit how you work.</Text>

      <Section title="Notifications">
        <ToggleRow label="Email digest after each call" value={notifyDigest} onChange={setNotifyDigest} />
        <ToggleRow label="Push when new tasks are found" value={notifyTasks} onChange={setNotifyTasks} />
      </Section>

      <Section title="Billing">
        <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 4 }}>Plan: {billing?.plan?.name ?? subscription}</Text>
        {billing?.trialActive ? (
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Trial active — {billing.trialDays} days left</Text>
        ) : subscription === 'free' ? (
          <Button title="Start 7-day Spark trial" onPress={handleStartTrial} loading={startingTrial} />
        ) : null}
      </Section>

      <View style={{ marginTop: 12 }}>
        <Button title="Sign out" variant="outline" onPress={handleSignOut} />
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, radius: r } = useTheme();
  return (
    <View style={[styles.section, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800' },
  section: { borderWidth: 1, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});
