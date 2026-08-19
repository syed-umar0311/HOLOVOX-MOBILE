import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { enterpriseApi } from '@/api/enterpriseApi';
import { EmptyState } from '@/components/ui/EmptyState';
import type { EnterpriseFlagWord } from '@/types/enterprise';

export function EnterpriseComplianceScreen({ token, enterpriseId, canEdit }: { token?: string; enterpriseId?: string; canEdit: boolean }) {
  const { colors, radius: r } = useTheme();
  const [words, setWords] = useState<EnterpriseFlagWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try {
      setWords(await enterpriseApi.getFlagWords(token, enterpriseId));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enterpriseId]);

  const handleAdd = async () => {
    const word = newWord.trim();
    if (!word) return;
    setAdding(true);
    try {
      const created = await enterpriseApi.createFlagWord({ word, type: 'flag', severity: 'medium' }, token, enterpriseId);
      if (created) setWords((prev) => [created, ...prev]);
      setNewWord('');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add word');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (word: EnterpriseFlagWord) => {
    Alert.alert('Remove watchword', `Remove "${word.word}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await enterpriseApi.deleteFlagWord(word._id, token, enterpriseId);
            setWords((prev) => prev.filter((w) => w._id !== word._id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove word');
          }
        },
      },
    ]);
  };

  if (loading) return <EmptyState title="Loading watchlist…" />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={words}
      keyExtractor={(item) => item._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      ListHeaderComponent={
        canEdit ? (
          <View style={styles.addRow}>
            <TextInput
              value={newWord}
              onChangeText={setNewWord}
              placeholder="Add a watchword…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: r.lg }]}
            />
            <Button title="Add" onPress={handleAdd} loading={adding} disabled={!newWord.trim()} />
          </View>
        ) : null
      }
      ListEmptyComponent={<EmptyState title="No watchwords configured." />}
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.lg }]}>
          <View
            style={[
              styles.severityDot,
              { backgroundColor: item.severity === 'high' ? colors.destructive : item.severity === 'medium' ? colors.chart4 : colors.mutedForeground },
            ]}
          />
          <Text style={{ color: colors.foreground, fontSize: 13, flex: 1 }}>{item.word}</Text>
          {canEdit ? (
            <Pressable onPress={() => handleDelete(item)}>
              <Text style={{ color: colors.destructive, fontSize: 12, fontWeight: '600' }}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 12, marginBottom: 8 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
});
