import React from 'react';
import { Alert, Pressable, ScrollView, Text, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { clearSession } from '@/lib/session';
import type { DashboardTabParamList, DashboardStackParamList } from '@/app/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DashboardTabParamList, 'More'>,
  NativeStackScreenProps<DashboardStackParamList>
>;

export function MoreScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { name, email, subscription } = useCurrentUser();

  const comingSoon = (feature: string) => Alert.alert('Coming soon', `${feature} ships in a later phase of the migration.`);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 20 }}>
        {email} · {subscription}
      </Text>

      <Row label="Recordings" onPress={() => navigation.navigate('Recordings')} />
      <Row label="Tasks" onPress={() => navigation.navigate('Tasks')} />
      <Row label="AI Skills" onPress={() => navigation.navigate('Skills')} />
      <Row label="InsightHub (Analytics)" onPress={() => navigation.navigate('Analytics')} />
      <Row label="Holo-Assist" onPress={() => navigation.navigate('HoloAssist')} />
      {subscription.startsWith('enterprise') ? <Row label="Enterprise" onPress={() => navigation.navigate('Enterprise')} /> : null}
      <Row label="Plans & Upgrade" onPress={() => comingSoon('Plans & upgrade')} />
      <Row label="Profile" onPress={() => navigation.navigate('Profile')} />
      <Row label="Settings" onPress={() => navigation.navigate('Settings')} />

      <Pressable style={styles.signOut} onPress={() => clearSession()}>
        <Text style={{ color: colors.destructive, fontSize: 14, fontWeight: '600' }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderColor: colors.border }]}>
      <Text style={{ color: colors.foreground, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.mutedForeground }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: { fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  signOut: { marginTop: 24, alignItems: 'center', paddingVertical: 12 },
});
