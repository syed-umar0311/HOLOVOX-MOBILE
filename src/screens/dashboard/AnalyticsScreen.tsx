import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchAnalytics, type AnalyticsPayload } from '@/api/analytics';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';

type Range = '7d' | '30d' | '90d';

function formatTalkTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function AnalyticsScreen() {
  const { colors, radius: r } = useTheme();
  const { userId, subscription } = useCurrentUser();
  const [range, setRange] = useState<Range>('30d');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const isFreePlan = subscription === 'free';

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAnalytics(userId, range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId, range]);

  const totals = data?.totals ?? { calls: 0, talkMinutes: 0, winRate: 0, activeReps: 0 };
  const maxCalls = Math.max(1, ...(data?.callsData.map((d) => d.calls) ?? [0]));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>InsightHub</Text>

      <View style={styles.rangeRow}>
        {(['7d', '30d', '90d'] as Range[]).map((rangeOpt) => (
          <Pressable
            key={rangeOpt}
            onPress={() => setRange(rangeOpt)}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: range === rangeOpt ? colors.foreground : colors.card },
            ]}>
            <Text style={{ color: range === rangeOpt ? colors.background : colors.foreground, fontSize: 12, fontWeight: '600' }}>
              {rangeOpt}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <EmptyState title="Loading analytics…" />
      ) : (
        <>
          <View style={styles.statRow}>
            <StatCard label="Calls" value={String(totals.calls)} sub="This period" />
            <StatCard label="Talk time" value={formatTalkTime(totals.talkMinutes)} sub={data?.meta.talkTimeIsEstimated ? 'Estimated' : 'This period'} />
          </View>
          {!isFreePlan ? (
            <View style={styles.statRow}>
              <StatCard label="Win rate" value={`${totals.winRate}%`} sub={data?.meta.winRateIsHeuristic ? 'Heuristic' : 'This period'} />
            </View>
          ) : null}

          {data?.callsData.length ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Calls per day</Text>
              {data.callsData.map((d) => (
                <View key={d.day} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{d.day}</Text>
                  <View style={[styles.barTrack, { backgroundColor: colors.muted, borderRadius: r.full }]}>
                    <View style={[styles.barFill, { width: `${(d.calls / maxCalls) * 100}%`, backgroundColor: colors.primary, borderRadius: r.full }]} />
                  </View>
                  <Text style={[styles.barValue, { color: colors.foreground }]}>{d.calls}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {isFreePlan ? (
            <View style={[styles.upsell, { backgroundColor: colors.primary, borderRadius: r.xl }]}>
              <Text style={styles.upsellText}>Upgrade to unlock sentiment analysis, topic tracking, win rate, and team leaderboards.</Text>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  section: { marginTop: 12, marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  barLabel: { width: 36, fontSize: 11 },
  barTrack: { flex: 1, height: 10, overflow: 'hidden' },
  barFill: { height: '100%' },
  barValue: { width: 24, fontSize: 11, textAlign: 'right' },
  upsell: { padding: 16, marginTop: 8 },
  upsellText: { color: '#fff', fontSize: 13, lineHeight: 18 },
});
