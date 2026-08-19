import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchRecordings, deleteRecording, type Recording } from '@/api/recordings';
import { EmptyState } from '@/components/ui/EmptyState';

// Recorder capture itself (screen+cam+mic mixing) is a browser-only feature with no
// direct RN equivalent — see the migration plan's "cannot be faked" section. This screen
// covers the real, portable part: listing, playing back, and deleting recordings the
// backend already has.
export function RecordingsScreen() {
  const { colors, radius: r } = useTheme();
  const { userId } = useCurrentUser();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setRecordings(await fetchRecordings(userId));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete recording', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteRecording(id);
            setRecordings((prev) => prev.filter((rec) => rec.id !== id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete recording');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={recordings}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState title="No recordings yet." />}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {item.source} · {item.date} · {item.duration}
            </Text>
          </View>
          <View style={styles.actions}>
            {item.playbackUrl ? (
              <Pressable onPress={() => Linking.openURL(item.playbackUrl!)} style={styles.actionBtn}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Play</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => handleDelete(item.id)} disabled={deletingId === item.id} style={styles.actionBtn}>
              <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '600' }}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 14, marginBottom: 8, gap: 10 },
  title: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { paddingVertical: 4 },
});
