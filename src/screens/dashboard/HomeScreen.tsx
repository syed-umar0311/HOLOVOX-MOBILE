import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { fetchMeetings, fetchMeetingHours, type Meeting } from '@/api/dashboard';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DashboardTabParamList, DashboardStackParamList } from '@/app/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DashboardTabParamList, 'Home'>,
  NativeStackScreenProps<DashboardStackParamList>
>;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatMeetingDate(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

export function HomeScreen({ navigation }: Props) {
  const { colors, radius: r } = useTheme();
  const { userId, email, name, subscription } = useCurrentUser();
  const rootNavigation = useRootNavigation();
  const firstName = String(name).split(' ')[0];

  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [recent, setRecent] = useState<Meeting[]>([]);
  const [meetingHours, setMeetingHours] = useState('0m');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!email) return;
    try {
      const { upcoming: up, past } = await fetchMeetings(email, userId ?? 'guest_user');
      setUpcoming(up);
      setRecent(past);
    } catch {
      // meetings are best-effort on the home screen
    }
    if (userId) {
      try {
        const hours = await fetchMeetingHours(userId);
        setMeetingHours(hours.label);
      } catch {
        // analytics best-effort
      }
    }
  }, [email, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isFree = subscription === 'free';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{greeting()}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Hey {firstName}, ready to Holo?</Text>
      <Text style={{ color: colors.mutedForeground, marginTop: 6, marginBottom: 20 }}>
        {isFree ? '1 hour limit per call' : 'All Holo features are unlocked for your workspace.'}
      </Text>

      <Pressable
        // Starts a real LiveKit call immediately (POST /token creates the room
        // server-side on first join). The full pre-join screen from web's
        // session.new.tsx — device preview, meeting title, invite flow — is a
        // follow-up refinement; this wires the actual call path, not a stub.
        onPress={() => rootNavigation.navigate('Call', { roomId: `holo-${Date.now().toString(36)}` })}
        style={[styles.hero, { backgroundColor: colors.primary, borderRadius: r['2xl'] }]}>
        <Text style={styles.heroEyebrow}>{subscription.toUpperCase()} · LIVE</Text>
        <Text style={styles.heroTitle}>Holo at me!</Text>
        <Text style={styles.heroSub}>Start a live AI-coached call. Real-time notes & nudges.</Text>
      </Pressable>

      <View style={styles.statRow}>
        <StatCard label="Meeting hours" value={meetingHours} sub="Last 30 days" onPress={() => navigation.navigate('Meetings')} />
        <StatCard label="Tasks" value="—" sub="See tasks" onPress={() => navigation.navigate('Tasks')} />
      </View>

      {upcoming.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Up next</Text>
          {upcoming.map((m) => (
            <View key={m.id} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
              <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{formatMeetingDate(m.date)}</Text>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{m.title}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent meetings</Text>
        {recent.length === 0 ? (
          <EmptyState title="No meetings found." subtitle="Your meetings will appear here." />
        ) : (
          recent.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => navigation.navigate('Meetings')}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
              <Text style={[styles.rowTitle, { color: colors.foreground }]}>{m.title}</Text>
              <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{formatMeetingDate(m.date)}</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  eyebrow: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  hero: { padding: 22, marginBottom: 16 },
  heroEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { borderWidth: 1, padding: 14, marginBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 11, marginTop: 2 },
});
