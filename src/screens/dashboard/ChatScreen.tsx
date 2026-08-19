import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchConversations, type Conversation } from '@/api/chat';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DashboardStackParamList, DashboardTabParamList } from '@/app/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<DashboardTabParamList, 'Chat'>,
  NativeStackScreenProps<DashboardStackParamList>
>;

export function ChatScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { userId } = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setConversations(await fetchConversations(userId));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      data={conversations}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      ListEmptyComponent={<EmptyState title="No conversations yet." subtitle="People you've met with will show up here." />}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate('ChatConversation', { conversationId: item.id, name: item.name })}
          style={[styles.row, { borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{item.name.slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  name: { fontSize: 15, fontWeight: '600' },
});
