import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { enterpriseApi } from '@/api/enterpriseApi';
import { computePerformanceByNode } from '@/lib/orgPerformance';
import { layoutTree } from '@/lib/orgTreeLayout';
import { RadarChart } from '@/components/enterprise/RadarChart';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EnterpriseFlagRecord, OrgNode } from '@/types/enterprise';

export function EnterprisePerformanceScreen({ token, enterpriseId }: { token?: string; enterpriseId?: string }) {
  const { colors, radius: r } = useTheme();
  const [nodes, setNodes] = useState<OrgNode[]>([]);
  const [edges, setEdges] = useState<[string, string][]>([]);
  const [flags, setFlags] = useState<EnterpriseFlagRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tree, flagData] = await Promise.all([
          enterpriseApi.getOrgTree(token, enterpriseId),
          enterpriseApi.getFlags(token, enterpriseId),
        ]);
        if (tree?.nodes) {
          setNodes(layoutTree(tree.nodes, tree.edges || []));
          setEdges(tree.edges || []);
          setSelectedId(tree.nodes[0]?.id ?? null);
        }
        setFlags(flagData);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, enterpriseId]);

  const performanceByNode = useMemo(
    () => computePerformanceByNode({ orgNodes: nodes, orgEdges: edges, flags, meetings: [], transcripts: [] }),
    [nodes, edges, flags],
  );

  if (loading) return <EmptyState title="Loading performance…" />;
  if (nodes.length === 0) return <EmptyState title="No organization data yet." />;

  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const performance = performanceByNode[selected.id];

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, marginBottom: 12 }}>
        Session-volume and message-discipline scores are computed from flags only in this build — meeting/transcript data isn't
        wired in yet, so those axes will read low until that's connected.
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {nodes.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => setSelectedId(n.id)}
            style={[
              styles.chip,
              { borderColor: colors.border, backgroundColor: selected.id === n.id ? colors.foreground : colors.card, borderRadius: r.full },
            ]}>
            <Text style={{ color: selected.id === n.id ? colors.background : colors.foreground, fontSize: 12, fontWeight: '600' }}>{n.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {performance ? (
        <View style={{ alignItems: 'center' }}>
          <RadarChart axes={performance.axes} now={performance.now} prev={performance.prev} size={300} />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
});
