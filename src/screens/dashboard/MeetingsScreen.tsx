import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { fetchMeetings, type Meeting } from '@/api/dashboard';
import { EmptyState } from '@/components/ui/EmptyState';

function formatMeetingDate(d: Date) {
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? `Today, ${time}` : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

// Meetings list/scheduling (web's Dashboard.meetings.tsx is a large, still-unbuilt
// scheduling UI — this covers the core "view + join" flow; full scheduling ships
// alongside the LiveKit call room in a later phase).
export function MeetingsScreen() {
  const { colors, radius: r } = useTheme();
  const { userId, email } = useCurrentUser();
  const rootNavigation = useRootNavigation();
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!email) return;
    const { upcoming: up, past: pastMeetings } = await fetchMeetings(email, userId ?? 'guest_user');
    setUpcoming(up);
    setPast(pastMeetings);
  }, [email, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const sections = [
    { title: 'Upcoming', data: upcoming },
    { title: 'Past', data: past },
  ].filter((s) => s.data.length > 0);

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      sections={sections}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState title="No meetings yet." subtitle="Scheduled and past meetings will appear here." />}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: colors.foreground, backgroundColor: colors.background }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => rootNavigation.navigate('Call', { roomId: item.id })}
          style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
          <Text style={[styles.rowTitle, { color: colors.foreground }]}>{item.title}</Text>
          <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
            {formatMeetingDate(item.date)} · {item.withPeople}
          </Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  row: { borderWidth: 1, padding: 14, marginBottom: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 11, marginTop: 4 },
});
