import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { SummaryPanel } from '../../components/dashboard/SummaryPanel';
import { TranscriptPanel } from '../../components/dashboard/TranscriptPanel';
import { RecordingsPanel } from '../../components/dashboard/RecordingsPanel';
import { useAuth } from '../../context/AuthContext';
import { formatShortDateTime } from '../../lib/date';
import { colors } from '../../theme/colors';
import type { MeetingListItem, TranscriptData } from '../../types/meetings';

/**
 * Ported from src/Pages/Dashboard.meetings.tsx (web MeetingsPage). Meeting
 * list, search/date filters, delete, transcript fetch, and AI-summary
 * generate all hit the same live endpoints as the web app. The web page's
 * side-by-side list+detail layout becomes a list → detail push on mobile;
 * the pre-meeting device-check modal and share/download (browser-only APIs
 * — camera/mic getUserMedia, Web Share, Blob downloads) stay as inert
 * placeholders since there's no mobile equivalent wired up yet.
 */

const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/v1';
const AI_ASSISTANT_API = 'https://holovoxserver-production-eb5d.up.railway.app/api/ai-assistant';

type DateFilter = '3days' | '7days' | '15days' | 'all';

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: '3days', label: '3 Days' },
  { id: '7days', label: '7 Days' },
  { id: '15days', label: '15 Days' },
  { id: 'all', label: 'All' },
];

function mapMeeting(m: any): MeetingListItem {
  const rawDate = new Date(m.createdAt ?? m.meetingDate ?? m.date ?? Date.now());
  const duration =
    typeof m.duration === 'string' ? m.duration : m.durationMinutes ? `${Math.floor(m.durationMinutes)}m` : '—';
  const people = Array.isArray(m.participants)
    ? m.participants
        .map((p: any) => p.name || p.email || 'Unknown')
        .filter(Boolean)
        .join(' · ')
    : 'You';
  const tags = Array.isArray(m.tags) ? m.tags : [m.type ?? 'Call'];

  return {
    id: String(m.meetingId ?? m.id ?? Math.random()),
    title: String(m.meetingTitle ?? m.title ?? 'Meeting'),
    date: formatShortDateTime(rawDate),
    duration,
    tags,
    people: people || 'You',
    rawDate,
  };
}

export default function MeetingsScreen() {
  const { session } = useAuth();
  const isFree = !session?.subscription || session.subscription === 'free';
  const currentUserId = session?.id;
  const currentUserEmail = session?.email;

  const [topTab, setTopTab] = useState<'recordings' | 'summaries'>('summaries');
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [pane, setPane] = useState<'summary' | 'transcript'>('transcript');

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('7days');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [transcripts, setTranscripts] = useState<TranscriptData | null>(null);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const res = await fetch(`${API_BASE_URL}/getMeeting`);
      const data = await res.json();
      if (data.success && Array.isArray(data.meetings)) {
        const belongsToUser = (m: any) =>
          m.hostId === currentUserId ||
          (Array.isArray(m.participants) && m.participants.some((p: any) => p.email === currentUserEmail));
        const mine = currentUserId || currentUserEmail ? data.meetings.filter(belongsToUser) : data.meetings;
        const mapped = mine.map(mapMeeting).sort((a: MeetingListItem, b: MeetingListItem) => b.rawDate.getTime() - a.rawDate.getTime());
        setMeetings(mapped);
        if (!activeId && mapped.length > 0) setActiveId(mapped[0].id);
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    } finally {
      setLoadingMeetings(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentUserEmail]);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const activeMeeting = useMemo(() => meetings.find(m => m.id === activeId) ?? null, [meetings, activeId]);

  useEffect(() => {
    if (!activeMeeting?.id) return;
    setLoadingTranscripts(true);
    setTranscriptError(null);
    setTranscripts(null);

    fetch(`${AI_ASSISTANT_API}/get-transcripts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingIds: [activeMeeting.id] }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.length > 0) {
          setTranscripts(data.data[0]);
        } else {
          setTranscriptError('No transcripts found for this meeting');
        }
      })
      .catch(err => {
        console.error('Error fetching transcripts:', err);
        setTranscriptError(err instanceof Error ? err.message : 'Failed to load transcripts');
      })
      .finally(() => setLoadingTranscripts(false));
  }, [activeMeeting?.id]);

  const filteredMeetings = useMemo(() => {
    let result = meetings;

    if (dateFilter !== 'all') {
      const days = { '3days': 3, '7days': 7, '15days': 15 }[dateFilter];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(m => m.rawDate >= cutoff);
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        m =>
          m.title.toLowerCase().includes(term) ||
          m.date.toLowerCase().includes(term) ||
          m.people.toLowerCase().includes(term) ||
          m.tags.some(t => t.toLowerCase().includes(term)),
      );
    }

    return result;
  }, [meetings, dateFilter, search]);

  const handleDelete = (meeting: MeetingListItem) => {
    Alert.alert('Delete meeting', `Delete "${meeting.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/meeting`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ meetingId: meeting.id }),
            });
            if (!res.ok) throw new Error('Failed to delete meeting');
            setMeetings(prev => prev.filter(m => m.id !== meeting.id));
            if (activeId === meeting.id) {
              const remaining = meetings.filter(m => m.id !== meeting.id);
              setActiveId(remaining[0]?.id ?? null);
              setView('list');
            }
          } catch (err) {
            console.error('Error deleting meeting:', err);
            Alert.alert('Error', 'Could not delete this meeting. Please try again.');
          }
        },
      },
    ]);
  };

  const openMeeting = (id: string) => {
    setActiveId(id);
    setView('detail');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meetings</Text>
          {/* <Text style={styles.subtitle}>Every call captured — searchable, summarized, ready to act on.</Text> */}
        </View>
        <Pressable style={styles.newMeetingButton}>
          <Icon name="plus" size={13} color={colors.card} />
          <Text style={styles.newMeetingLabel}>New</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['summaries', 'recordings'] as const).map(t => (
          <Pressable key={t} style={styles.tab} onPress={() => setTopTab(t)}>
            <Text style={[styles.tabLabel, topTab === t && styles.tabLabelActive]}>
              {t === 'recordings' ? 'Recordings' : 'Summaries'}
            </Text>
            {topTab === t ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        ))}
      </View>

      {topTab === 'recordings' ? (
        <ScrollView contentContainerStyle={styles.recordingsScroll}>
          <RecordingsPanel isFree={isFree} userId={currentUserId} />
        </ScrollView>
      ) : view === 'detail' && activeMeeting ? (
        <ScrollView contentContainerStyle={styles.detailScroll}>
          <Pressable style={styles.backRow} onPress={() => setView('list')} hitSlop={8}>
            <Icon name="chevronLeft" size={14} color={colors.inkMuted60} />
            <Text style={styles.backLabel}>All meetings</Text>
          </Pressable>

          <Text style={styles.detailMeta}>
            {activeMeeting.date} · {activeMeeting.duration}
          </Text>
          <Text style={styles.detailTitle}>{activeMeeting.title}</Text>
          <View style={styles.tagRow}>
            {activeMeeting.tags.map(t => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={styles.paneSwitch}>
            {(['summary', 'transcript'] as const).map(p => (
              <Pressable key={p} style={[styles.paneButton, pane === p && styles.paneButtonActive]} onPress={() => setPane(p)}>
                <Text style={[styles.paneButtonLabel, pane === p && styles.paneButtonLabelActive]}>
                  {p === 'summary' ? 'Summary' : 'Transcript'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.paneContent}>
            {pane === 'summary' ? (
              <SummaryPanel
                meetingId={activeMeeting.id}
                userId={currentUserId ?? 'usr_abc123'}
                transcripts={transcripts}
                isFree={isFree}
              />
            ) : (
              <TranscriptPanel transcripts={transcripts} isLoading={loadingTranscripts} error={transcriptError} />
            )}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.listArea}>
          <View style={styles.searchBar}>
            <Icon name="search" size={14} color={colors.inkMuted40} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, date, or person…"
              placeholderTextColor={colors.mutedForeground}
              style={styles.searchInput}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Icon name="close" size={11} color={colors.inkMuted40} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filterRow}>
            {DATE_FILTERS.map(f => (
              <Pressable
                key={f.id}
                style={[styles.filterChip, dateFilter === f.id && styles.filterChipActive]}
                onPress={() => setDateFilter(f.id)}
              >
                <Text style={[styles.filterChipLabel, dateFilter === f.id && styles.filterChipLabelActive]}>{f.label}</Text>
              </Pressable>
            ))}
          </View>

          {loadingMeetings ? (
            <ActivityIndicator color={colors.magenta} style={styles.loader} />
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {filteredMeetings.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>
                    {search ? 'No meetings found matching your filters' : 'No meetings in this time period'}
                  </Text>
                </View>
              ) : (
                filteredMeetings.map(m => (
                  <View key={m.id} style={styles.meetingRow}>
                    <Pressable style={styles.meetingRowMain} onPress={() => openMeeting(m.id)}>
                      <Text style={styles.meetingTitle} numberOfLines={1}>
                        {m.title}
                      </Text>
                      <Text style={styles.meetingMeta} numberOfLines={1}>
                        {m.date} · {m.duration}
                      </Text>
                      <Text style={styles.meetingPeople} numberOfLines={1}>
                        {m.people}
                      </Text>
                    </Pressable>
                    <Pressable style={styles.deleteButton} onPress={() => handleDelete(m)} hitSlop={8}>
                      <Icon name="trash" size={14} color={colors.inkMuted40} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
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
    maxWidth: 220,
  },
  newMeetingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  newMeetingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
  },
  tabs: {
    flexDirection: 'row',
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkMuted10,
  },
  tab: {
    paddingBottom: 10,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.inkMuted60,
  },
  tabLabelActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  tabIndicator: {
    marginTop: 9,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.magenta,
  },
  listArea: {
    flex: 1,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
  },
  filterChipActive: {
    backgroundColor: colors.magenta,
    borderColor: colors.magenta,
  },
  filterChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  filterChipLabelActive: {
    color: colors.card,
  },
  loader: {
    paddingVertical: 32,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
  },
  meetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meetingRowMain: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 14,
    gap: 3,
  },
  meetingTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  meetingMeta: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  meetingPeople: {
    fontSize: 10,
    color: colors.inkMuted40,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
  },
  detailScroll: {
    paddingBottom: 40,
  },
  recordingsScroll: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backLabel: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
  detailMeta: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkMuted40,
  },
  detailTitle: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    borderRadius: 999,
    backgroundColor: colors.inkMuted10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  paneSwitch: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 20,
    backgroundColor: colors.inkMuted10,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'flex-start',
  },
  paneButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  paneButtonActive: {
    backgroundColor: colors.card,
  },
  paneButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  paneButtonLabelActive: {
    color: colors.ink,
  },
  paneContent: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 18,
  },
});
