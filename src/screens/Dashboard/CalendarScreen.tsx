import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { ScheduleMeetingModal, type ScheduleMeetingPayload } from '../../components/dashboard/ScheduleMeetingModal';
import { ShareMeetingModal } from '../../components/dashboard/ShareMeetingModal';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { getMeetingEnd, getMeetingStart, type CalendarMeeting, type MeetingCategory } from '../../types/calendar';

/**
 * Ported from src/Pages/Dashboard.calendar.tsx (web CalendarPage). Meeting
 * fetch/create/update/delete and the share-invite email all hit the same
 * live endpoints as the web app. The web page's side-by-side month-calendar
 * + hour-by-hour week grid doesn't fit a phone screen, so the week grid is
 * dropped in favor of the month calendar + category-filtered list (the
 * month grid's day dots and selection already came from the same data).
 * "Copy link" hands off to the native share sheet (Share.share) since core
 * RN has no clipboard API without adding a dependency; ICS/Google Calendar
 * auto-sync relied on browser-only window.open() and was skipped.
 */

const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/v1';
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CATEGORIES: { id: MeetingCategory; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'past', label: 'Past' },
];

function mapMeeting(m: any): CalendarMeeting {
  const date = new Date(m.date || m.meetingDate);
  const [hh, mm] = (m.time || '00:00').split(':').map(Number);
  const participants =
    m.participants?.filter((p: any) => p.role !== 'host').map((p: any) => p.email || p.name) ?? [];
  const meetingLink = m.meetingLink ?? m.meetingUrl ?? m.link ?? m.joinLink ?? m.inviteLink ?? m.url;

  return {
    id: m.meetingId,
    title: m.meetingTitle,
    start: `${m.time ?? ''}`,
    hour: Number.isNaN(hh) ? 0 : hh,
    minute: Number.isNaN(mm) ? 0 : mm,
    duration: 1,
    date,
    meetingLink,
    agenda: m.agenda || '',
    participants,
  };
}

export default function CalendarScreen() {
  const { session } = useAuth();
  const currentUserId = session?.id;
  const currentUserEmail = session?.email;
  const currentUserName = session?.name ?? 'HOLOVOX Host';

  const [cursor, setCursor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetings, setMeetings] = useState<CalendarMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MeetingCategory>('upcoming');

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CalendarMeeting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [sharingMeeting, setSharingMeeting] = useState<CalendarMeeting | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const today = new Date();

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/getMeeting`);
      const data = await res.json();
      if (data.success && data.meetings) {
        const mine = data.meetings.filter(
          (m: any) => m.hostId === currentUserId || m.participants?.some((p: any) => p.email === currentUserEmail),
        );
        setMeetings(mine.map(mapMeeting));
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserEmail]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings
      .filter(m => {
        const start = getMeetingStart(m);
        const end = getMeetingEnd(m);
        if (category === 'upcoming') return start > now;
        if (category === 'past') return end < now;
        return start <= now && now <= end;
      })
      .sort((a, b) => getMeetingStart(a).getTime() - getMeetingStart(b).getTime());
  }, [meetings, category]);

  const monthMeetingDays = useMemo(() => {
    const set = new Set<number>();
    filteredMeetings.forEach(m => {
      if (m.date.getMonth() === cursor.getMonth() && m.date.getFullYear() === cursor.getFullYear()) {
        set.add(m.date.getDate());
      }
    });
    return set;
  }, [cursor, filteredMeetings]);

  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const isToday = (d: number) =>
    d === today.getDate() && cursor.getMonth() === today.getMonth() && cursor.getFullYear() === today.getFullYear();
  const isSelected = (d: number) =>
    d === selectedDate.getDate() && cursor.getMonth() === selectedDate.getMonth() && cursor.getFullYear() === selectedDate.getFullYear();

  const handleCopyLink = (link: string) => {
    Share.share({ message: link }).catch(() => {});
  };

  const handleDelete = (meeting: CalendarMeeting) => {
    Alert.alert('Delete meeting', `Remove "${meeting.title}" from the schedule?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(meeting.id);
          try {
            const res = await fetch(`${API_BASE_URL}/meeting`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId: meeting.id }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete meeting');
            setMeetings(prev => prev.filter(m => m.id !== meeting.id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete meeting');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleSaveMeeting = async (payload: ScheduleMeetingPayload) => {
    setIsSaving(true);
    try {
      if (editingMeeting) {
        const res = await fetch(`${API_BASE_URL}/updateMeeting/${editingMeeting.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingTitle: payload.title,
            date: payload.date.toISOString(),
            time: payload.time,
            agenda: payload.agenda,
            participants: payload.participants.map(email => ({ email: email.trim(), role: 'guest' })),
            name: currentUserName,
            email: currentUserEmail,
            upcoming: true,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || 'Failed to update meeting');
        await fetchMeetings();
      } else {
        const generatedMeetingId = Math.random().toString(36).substring(2, 10);
        const res = await fetch(`${API_BASE_URL}/createmeeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId: currentUserId,
            name: currentUserName,
            email: currentUserEmail,
            meetingId: generatedMeetingId,
            meetingTitle: payload.title,
            date: payload.date.toISOString(),
            time: payload.time,
            agenda: payload.agenda,
            participants: payload.participants.map(email => ({ email: email.trim(), role: 'guest' })),
            upcoming: true,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.message || 'Failed to schedule meeting');

        if (payload.participants.length > 0) {
          try {
            await fetch(`${API_BASE_URL}/shareMeetingLink`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                meetingLink: `https://holovox.io/room/${generatedMeetingId}`,
                emails: payload.participants,
                meetingId: generatedMeetingId,
                hostName: currentUserName,
                hostEmail: currentUserEmail,
                title: payload.title,
                agenda: payload.agenda,
                time: payload.time,
              }),
            });
          } catch (shareErr) {
            console.error('Error notifying participants:', shareErr);
          }
        }
        await fetchMeetings();
      }
      setEditingMeeting(null);
      setScheduleOpen(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong while scheduling.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitShare = async (emails: string[]) => {
    if (!sharingMeeting) return;
    setIsSharing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/shareMeetingLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingLink: sharingMeeting.meetingLink,
          emails,
          meetingId: sharingMeeting.id,
          hostName: currentUserName,
          hostEmail: currentUserEmail,
          title: sharingMeeting.title,
          time: sharingMeeting.start,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to share meeting');
      setShareOpen(false);
      setSharingMeeting(null);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not share meeting');
    } finally {
      setIsSharing(false);
    }
  };

  const openSchedule = (meeting?: CalendarMeeting) => {
    setEditingMeeting(meeting ?? null);
    setScheduleOpen(true);
  };

  return (
    <View style={styles.container}>
      <ScheduleMeetingModal
        visible={scheduleOpen}
        meeting={editingMeeting}
        defaultDate={selectedDate}
        isSaving={isSaving}
        onClose={() => {
          setScheduleOpen(false);
          setEditingMeeting(null);
        }}
        onSubmit={handleSaveMeeting}
      />

      <ShareMeetingModal
        visible={shareOpen}
        meetingTitle={sharingMeeting?.title}
        isSharing={isSharing}
        onClose={() => {
          setShareOpen(false);
          setSharingMeeting(null);
        }}
        onSubmit={handleSubmitShare}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Calendar</Text>
            {/* <Text style={styles.subtitle}>{monthMeetingDays.size} meeting day{monthMeetingDays.size === 1 ? '' : 's'} this month</Text> */}
          </View>
          <Pressable style={styles.scheduleButton} onPress={() => openSchedule()}>
            <Icon name="plus" size={13} color={colors.card} />
            <Text style={styles.scheduleButtonLabel}>Schedule</Text>
          </Pressable>
        </View>

        <View style={styles.categoryRow}>
          {CATEGORIES.map(c => (
            <Pressable
              key={c.id}
              style={[styles.categoryChip, category === c.id && styles.categoryChipActive]}
              onPress={() => setCategory(c.id)}
            >
              <Text style={[styles.categoryChipLabel, category === c.id && styles.categoryChipLabelActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} hitSlop={8}>
              <Icon name="chevronLeft" size={13} color={colors.ink} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTHS_LONG[cursor.getMonth()]} {cursor.getFullYear()}
            </Text>
            <Pressable onPress={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} hitSlop={8}>
              <Icon name="chevronRight" size={13} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map(d => (
              <Text key={d} style={styles.weekdayLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.dayRow}>
                {week.map((d, i) => (
                  <Pressable
                    key={i}
                    disabled={!d}
                    style={[
                      styles.dayCell,
                      Boolean(d) && isSelected(d as number) ? styles.dayCellSelected : null,
                      Boolean(d) && !isSelected(d as number) && isToday(d as number) ? styles.dayCellToday : null,
                    ]}
                    onPress={() => d && setSelectedDate(new Date(cursor.getFullYear(), cursor.getMonth(), d))}
                  >
                    {d ? (
                      <>
                        <Text style={[styles.dayLabel, isSelected(d) && styles.dayLabelSelected]}>{d}</Text>
                        {monthMeetingDays.has(d) && !isSelected(d) ? <View style={styles.dayDot} /> : null}
                      </>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {category === 'upcoming' ? 'Upcoming meetings' : category === 'ongoing' ? 'Ongoing meetings' : 'Past meetings'}
            </Text>
            <Pressable onPress={() => openSchedule()} hitSlop={8}>
              <Text style={styles.addLink}>+ Add</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.magenta} style={styles.loader} />
          ) : filteredMeetings.length === 0 ? (
            <Text style={styles.emptyText}>No meetings in this category.</Text>
          ) : (
            <View style={styles.list}>
              {filteredMeetings.map(m => (
                <View key={m.id} style={styles.meetingCard}>
                  <Text style={styles.meetingTitle}>{m.title}</Text>
                  <Text style={styles.meetingTime}>{m.start}</Text>
                  {m.agenda ? (
                    <Text style={styles.meetingAgenda} numberOfLines={2}>
                      {m.agenda}
                    </Text>
                  ) : null}
                  {m.participants.length > 0 ? (
                    <Text style={styles.meetingParticipants}>
                      <Text style={styles.meetingParticipantsLabel}>Participants: </Text>
                      {m.participants.join(', ')}
                    </Text>
                  ) : null}
                  {m.meetingLink ? (
                    <Text style={styles.meetingLink} numberOfLines={1}>
                      {m.meetingLink}
                    </Text>
                  ) : null}

                  <View style={styles.meetingActions}>
                    {category === 'upcoming' ? (
                      <Pressable style={styles.iconButton} onPress={() => openSchedule(m)} hitSlop={6}>
                        <Icon name="edit" size={13} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {(category === 'upcoming' || category === 'ongoing') && m.meetingLink ? (
                      <Pressable style={styles.iconButton} onPress={() => handleCopyLink(m.meetingLink!)} hitSlop={6}>
                        <Icon name="copy" size={13} color={colors.ink} />
                      </Pressable>
                    ) : null}
                    {category === 'ongoing' && m.meetingLink ? (
                      <Pressable style={styles.joinButton} onPress={() => Linking.openURL(m.meetingLink!)}>
                        <Text style={styles.joinButtonLabel}>Join</Text>
                      </Pressable>
                    ) : null}
                    {(category === 'upcoming' || category === 'ongoing') ? (
                      <Pressable
                        style={styles.shareButton}
                        onPress={() => {
                          setSharingMeeting(m);
                          setShareOpen(true);
                        }}
                      >
                        <Text style={styles.shareButtonLabel}>Share</Text>
                      </Pressable>
                    ) : null}
                    {category === 'upcoming' ? (
                      <Pressable style={styles.iconButton} onPress={() => handleDelete(m)} disabled={deletingId === m.id} hitSlop={6}>
                        <Icon name="trash" size={13} color={colors.inkMuted60} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.inkMuted60,
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scheduleButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
  },
  categoryChipActive: {
    backgroundColor: colors.magenta,
    borderColor: colors.magenta,
  },
  categoryChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  categoryChipLabelActive: {
    color: colors.card,
  },
  monthCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 18,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkMuted40,
  },
  dayGrid: {
    marginTop: 6,
    gap: 2,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: colors.magenta,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: 'rgba(225, 29, 72, 0.4)',
  },
  dayLabel: {
    fontSize: 13,
    color: colors.ink,
  },
  dayLabelSelected: {
    color: colors.card,
    fontWeight: '700',
  },
  dayDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.magenta,
  },
  listCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 18,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  addLink: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.magenta,
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkMuted40,
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  meetingCard: {
    borderRadius: 18,
    backgroundColor: colors.canvas,
    padding: 16,
    gap: 4,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  meetingTime: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  meetingAgenda: {
    marginTop: 4,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.inkMuted60,
  },
  meetingParticipants: {
    marginTop: 4,
    fontSize: 11,
    color: colors.inkMuted60,
  },
  meetingParticipantsLabel: {
    fontWeight: '700',
  },
  meetingLink: {
    marginTop: 4,
    fontSize: 10,
    color: colors.inkMuted40,
  },
  meetingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
  },
  joinButton: {
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  joinButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.card,
  },
  shareButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  shareButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
  },
});
