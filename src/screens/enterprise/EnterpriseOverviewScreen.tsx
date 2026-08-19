import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { enterpriseApi } from '@/api/enterpriseApi';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EnterpriseOverviewData } from '@/types/enterprise';

export function EnterpriseOverviewScreen({ token, enterpriseId }: { token?: string; enterpriseId?: string }) {
  const { colors, radius: r } = useTheme();
  const [data, setData] = useState<EnterpriseOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const overview = await enterpriseApi.getOverview(token, enterpriseId);
      setData(overview ?? null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enterpriseId]);

  if (loading) return <EmptyState title="Loading overview…" />;
  if (!data) return <EmptyState title="No overview data available yet." />;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>
      <View style={styles.kpiGrid}>
        {data.kpis.map((kpi, i) => (
          <View key={i} style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.xl }]}>
            <Text style={[styles.kpiValue, { color: colors.foreground }]}>{kpi.value}</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{kpi.label}</Text>
            <Text style={{ color: kpi.deltaType === 'up' ? colors.chart3 : colors.destructive, fontSize: 11, marginTop: 4 }}>{kpi.delta}</Text>
          </View>
        ))}
      </View>

      {data.brainReadiness ? (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.xl }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Company Brain readiness</Text>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: '800' }}>{data.brainReadiness.combined}%</Text>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Leaderboard</Text>
      {data.leaderboard.map((entry, i) => (
        <View key={i} style={[styles.row, { borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: entry.color }]} />
          <Text style={{ color: colors.foreground, flex: 1, fontSize: 13 }}>{entry.name}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{entry.score}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 16 }]}>Activity</Text>
      {data.feed.map((item, i) => (
        <View key={i} style={[styles.row, { borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: item.color }]} />
          <Text style={{ color: colors.foreground, flex: 1, fontSize: 12 }}>{item.text}</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{item.time}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', borderWidth: 1, padding: 14 },
  kpiValue: { fontSize: 22, fontWeight: '800' },
  section: { borderWidth: 1, padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
