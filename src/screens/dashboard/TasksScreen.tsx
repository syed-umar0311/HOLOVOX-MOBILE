import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchTasks, updateTaskStatus, type Task } from '@/api/dashboard';
import { EmptyState } from '@/components/ui/EmptyState';

type Filter = 'all' | 'open' | 'completed';

export function TasksScreen() {
  const { colors, radius: r } = useTheme();
  const { userId, email, name } = useCurrentUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const identifier = { userEmail: email, userId, userName: String(name) };

  const load = useCallback(async () => {
    if (!email && !userId) return;
    setTasks(await fetchTasks(identifier));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const toggle = async (task: Task) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    setUpdatingId(task._id);
    try {
      await updateTaskStatus(task._id, nextStatus, identifier);
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: nextStatus } : t)));
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = tasks.filter((t) => {
    if (filter === 'open') return t.status !== 'completed';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const openCount = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={filtered}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListHeaderComponent={
        <View style={styles.filterRow}>
          {(
            [
              ['all', `All (${tasks.length})`],
              ['open', `Open (${openCount})`],
              ['completed', `Done (${completedCount})`],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: filter === key ? colors.foreground : colors.card },
              ]}>
              <Text style={{ color: filter === key ? colors.background : colors.foreground, fontSize: 12, fontWeight: '600' }}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={<EmptyState title="No tasks found." subtitle="Holo extracts tasks automatically after every call." />}
      renderItem={({ item }) => {
        const isCompleted = item.status === 'completed';
        return (
          <Pressable
            onPress={() => toggle(item)}
            disabled={updatingId === item._id}
            style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
            <View style={[styles.checkbox, { borderColor: isCompleted ? colors.chart3 : colors.border, backgroundColor: isCompleted ? colors.chart3 : 'transparent' }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.task, { color: colors.foreground, textDecorationLine: isCompleted ? 'line-through' : 'none' }]}>
                {item.task}
              </Text>
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                {item.assignedBy || 'Unknown'} · {item.meetingTitle}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2 },
  task: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 11, marginTop: 4 },
});
