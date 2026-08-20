import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { QuickAction } from '../../components/dashboard/QuickAction';
import { StatCard } from '../../components/dashboard/StatCard';
import { SectionHeader } from '../../components/dashboard/SectionHeader';
import { MeetingRow, PrepItem } from '../../components/dashboard/MeetingRow';
import { formatMeetingDateTime, formatTalkTime } from '../../lib/date';
import { colors } from '../../theme/colors';

/**
 * Ported from src/Pages/dashboard.index.tsx (web DashboardHome). Same live
 * endpoints for meetings/tasks/meeting-hours/enterprise-flags; navigation
 * targets that don't exist yet on mobile (new call, calendar, join-meeting
 * modal, trial modal) stay as inert quick-action buttons.
 */

const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/v1';
const API_BASE_URL_LOCAL = 'https://holovoxserver-production-eb5d.up.railway.app';

const PAID_TIERS = ['spark', 'enterprise', 'enterprise-manager', 'enterprise-user'];

interface MeetingItem {
  id: string;
  title: string;
  date: Date;
}

interface TaskItem {
  id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

function mapMeeting(m: any): MeetingItem {
  return {
    id: m.meetingId,
    title: m.meetingTitle,
    date: new Date(m.meetingDate),
  };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { session } = useAuth();
  const subscription = session?.subscription ?? 'free';
  const isFree = !subscription || subscription === 'free';
  const isPaid = PAID_TIERS.includes(subscription);
  const isEnterprise = subscription === 'enterprise';

  const name = (session?.name ?? 'there').split(' ')[0];
  const currentUserId = session?.id ?? 'guest_user';
  const currentUserEmail = session?.email ?? 'guest@example.com';

  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [meetingHours, setMeetingHours] = useState('0m');
  const [meetingHoursSub, setMeetingHoursSub] = useState('Estimated from transcripts');
  const [enterpriseFlagsCount, setEnterpriseFlagsCount] = useState(0);
  const [enterpriseFlagMembers, setEnterpriseFlagMembers] = useState(0);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/getMeeting?email=${currentUserEmail}`);
      const data = await res.json();
      if (data.success && data.meetings) {
        const belongsToUser = (m: any) =>
          m.hostId === currentUserId || m.participants?.some((p: any) => p.email === currentUserEmail);
        const past = data.meetings.filter((m: any) => m.upcoming === false && belongsToUser(m));
        const upcoming = data.meetings.filter((m: any) => m.upcoming === true && belongsToUser(m));
        setMeetings(past.map(mapMeeting));
        setUpcomingMeetings(upcoming.map(mapMeeting));
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  }, [currentUserId, currentUserEmail]);

  const fetchMeetingHours = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/analytics/${currentUserId}?range=30d`);
      const payload = await response.json();
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.message || 'Failed to load meeting hours');
      }
      setMeetingHours(formatTalkTime(payload.data.totals.talkMinutes));
      setMeetingHoursSub(payload.data.meta.talkTimeIsEstimated ? 'Estimated from transcripts' : 'This period');
    } catch (err) {
      console.error('Error fetching meeting hours:', err);
    }
  }, [currentUserId]);

  const fetchEnterpriseFlags = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.token) headers.Authorization = `Bearer ${session.token}`;

      const res = await fetch(`${API_BASE_URL}/enterprise/flags?enterpriseId=${currentUserId}`, { headers });
      if (!res.ok) {
        setEnterpriseFlagsCount(0);
        setEnterpriseFlagMembers(0);
        return;
      }
      const data = await res.json();
      const flags = Array.isArray(data?.data) ? data.data : [];
      const openFlags = flags.filter((flag: any) => flag.status !== 'resolved');
      const memberIds = new Set(
        openFlags
          .map((flag: any) => flag.flaggedMemberId?._id || flag.flaggedMemberId || flag.speakerMemberId?._id || flag.speakerMemberId)
          .filter(Boolean),
      );
      setEnterpriseFlagsCount(openFlags.length);
      setEnterpriseFlagMembers(memberIds.size);
    } catch (err) {
      console.error('Error fetching enterprise flags:', err);
      setEnterpriseFlagsCount(0);
      setEnterpriseFlagMembers(0);
    }
  }, [currentUserId, session?.token]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL_LOCAL}/api/ai-assistant/tasks?userEmail=${currentUserEmail}`);
      const data = await res.json();
      setTasks(data?.data ?? []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [currentUserEmail]);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([fetchMeetings(), fetchTasks(), fetchMeetingHours(), fetchEnterpriseFlags()]).finally(() =>
      setLoading(false),
    );
  }, [fetchMeetings, fetchTasks, fetchMeetingHours, fetchEnterpriseFlags]);

  const openTasksCount = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {isFree ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            You&apos;re on Free — video only, 1-hour calls, no transcripts or AI brief. Spark unlocks everything.
          </Text>
        </View>
      ) : null}

      <View style={styles.greetingBlock}>
        <Text style={styles.greetingLabel}>{getGreeting()}</Text>
        <Text style={styles.greetingTitle}>Hey {name}, ready to Holo?</Text>
        <Text style={styles.greetingSub}>
          {isPaid ? 'All Holo features are unlocked for your workspace.' : '1 hour limit per call'}
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroKicker}>
          {subscription} · Live
        </Text>
        <Text style={styles.heroTitle}>Holo at me!</Text>
        <Text style={styles.heroSub}>Start a live AI-coached call. Real-time notes, translations & nudges.</Text>
        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Live transcript</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Real-time translation</Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>AI nudges</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <QuickAction icon="plus" label="New meeting" />
        <QuickAction icon="calendar" label="Schedule" />
        <QuickAction icon="users" label="Join Meeting" />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.magenta} style={styles.loader} />
      ) : (
        <>
          <View style={styles.statsRow}>
            {isEnterprise ? (
              <StatCard label="Flags" value={`${Math.max(0, enterpriseFlagsCount)}`} sub={`${enterpriseFlagMembers} members`} />
            ) : null}
            <StatCard label="New tasks" value={`${openTasksCount}`} sub="Last 7 days" />
            <StatCard label="Meeting hours" value={meetingHours} sub={meetingHoursSub} />
          </View>

          {upcomingMeetings.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Up next" hint="Your upcoming meetings" />
              <View style={styles.list}>
                {upcomingMeetings.map(m => (
                  <PrepItem key={m.id} time={formatMeetingDateTime(m.date)} title={m.title} tag="Call" />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader title="Recent meetings" />
            <View style={styles.list}>
              {meetings.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No meetings found. Your upcoming meetings will appear here.</Text>
                </View>
              ) : (
                meetings.map(m => <MeetingRow key={m.id} title={m.title} date={formatMeetingDateTime(m.date)} tag="Call" />)
              )}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    gap: 28,
  },
  banner: {
    borderRadius: 16,
    backgroundColor: 'rgba(225, 29, 72, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.18)',
    padding: 14,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.magenta,
  },
  greetingBlock: {
    gap: 6,
  },
  greetingLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkMuted40,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.ink,
    lineHeight: 32,
  },
  greetingSub: {
    fontSize: 13,
    color: colors.inkMuted60,
  },
  hero: {
    borderRadius: 26,
    backgroundColor: colors.magenta,
    padding: 22,
    gap: 10,
  },
  heroKicker: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.7)',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.card,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  heroChip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroChipText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.card,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  loader: {
    paddingVertical: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  section: {
    gap: 14,
  },
  list: {
    gap: 10,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 16,
  },
  emptyText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkMuted60,
  },
});
