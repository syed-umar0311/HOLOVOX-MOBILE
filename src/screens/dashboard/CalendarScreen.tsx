import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchAllMeetings, type Meeting } from '@/api/dashboard';
import { getCalendarProviderLinks, shareIcsFile } from '@/lib/calendar-links';
import { EmptyState } from '@/components/ui/EmptyState';

// Web's Dashboard.calendar.tsx is a drag/drop hour-grid week view — that interaction
// model doesn't translate well to a phone screen, so this is an agenda list instead:
// same data (GET /getMeeting) and the same "Add to Calendar" provider logic, presented
// the way mobile calendar apps normally do (a scrollable list of upcoming events).
export function CalendarScreen() {
  const { colors, radius: r } = useTheme();
  const { userId, email, name } = useCurrentUser();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!email) return;
    const all = await fetchAllMeetings(email, userId ?? 'guest_user');
    setMeetings(all.sort((a, b) => a.date.getTime() - b.date.getTime()));
  }, [email, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAddToCalendar = async (meeting: Meeting) => {
    const links = getCalendarProviderLinks({
      title: meeting.title,
      description: meeting.agenda,
      joinUrl: meeting.meetingLink,
      start: meeting.date,
      organizer: { name: String(name), email },
    });

    const google = links.find((l) => l.id === 'google' && l.kind === 'link');
    const ics = links.find((l) => l.id === 'apple' && l.kind === 'download');

    Alert.alert('Add to calendar', meeting.title, [
      google && google.kind === 'link'
        ? { text: 'Open in Google Calendar', onPress: () => Linking.openURL(google.href) }
        : undefined,
      ics && ics.kind === 'download' ? { text: 'Share .ics file', onPress: () => shareIcsFile(ics.getFile()) } : undefined,
      { text: 'Cancel', style: 'cancel' },
    ].filter(Boolean) as Array<{ text: string; onPress?: () => void; style?: 'cancel' }>);
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={meetings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState title="No meetings scheduled." />}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {item.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} · {item.timeLabel}
            </Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.withPeople}</Text>
          </View>
          <Pressable onPress={() => handleAddToCalendar(item)} style={[styles.addBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, marginBottom: 8, gap: 10 },
  date: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  title: { fontSize: 14, fontWeight: '600', marginTop: 4 },
  meta: { fontSize: 11, marginTop: 2 },
  addBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
