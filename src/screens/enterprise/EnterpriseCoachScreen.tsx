import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { enterpriseApi } from '@/api/enterpriseApi';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EnterpriseFlagRecord } from '@/types/enterprise';

const PIPELINE: EnterpriseFlagRecord['status'][] = ['flagged', 'manager_review', 'rep_coached', 'repaired', 'resolved'];
const STAGE_LABEL: Record<EnterpriseFlagRecord['status'], string> = {
  flagged: 'Flagged',
  manager_review: 'Manager review',
  rep_coached: 'Rep coached',
  repaired: 'Repaired',
  resolved: 'Resolved',
};

function nextStage(status: EnterpriseFlagRecord['status']): EnterpriseFlagRecord['status'] | null {
  const idx = PIPELINE.indexOf(status);
  return idx >= 0 && idx < PIPELINE.length - 1 ? PIPELINE[idx + 1] : null;
}

export function EnterpriseCoachScreen({ token, enterpriseId, canEdit }: { token?: string; enterpriseId?: string; canEdit: boolean }) {
  const { colors, radius: r } = useTheme();
  const [flags, setFlags] = useState<EnterpriseFlagRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    try {
      setFlags(await enterpriseApi.getFlags(token, enterpriseId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enterpriseId]);

  const advance = async (flag: EnterpriseFlagRecord) => {
    const next = nextStage(flag.status);
    if (!next) return;
    setUpdatingId(flag._id);
    try {
      await enterpriseApi.updateFlagStatus(flag._id, next, token, enterpriseId);
      setFlags((prev) => prev.map((f) => (f._id === flag._id ? { ...f, status: next } : f)));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <EmptyState title="Loading coaching flags…" />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={flags}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState title="No coaching flags." subtitle="Flagged moments from calls will show up here." />}
      renderItem={({ item }) => {
      const next = nextStage(item.status);
        return (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
            <View style={styles.row}>
              <View
                style={[
                  styles.severityDot,
                  { backgroundColor: item.severity === 'high' ? colors.destructive : item.severity === 'medium' ? colors.chart4 : colors.mutedForeground },
                ]}
              />
              <Text style={[styles.word, { color: colors.foreground }]}>"{item.matchedWord}"</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginLeft: 'auto' }}>{STAGE_LABEL[item.status]}</Text>
            </View>
            {item.quote ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>"{item.quote}"</Text> : null}
            {canEdit && next ? (
              <Pressable
                disabled={updatingId === item._id}
                onPress={() => advance(item)}
                style={[styles.advanceBtn, { backgroundColor: colors.primary, borderRadius: r.full }]}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                  {updatingId === item._id ? 'Updating…' : `Advance to ${STAGE_LABEL[next]}`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  word: { fontSize: 13, fontWeight: '700' },
  advanceBtn: { marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8 },
});
