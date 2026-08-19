import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { fetchMessages, sendMessage, type ChatMessage } from '@/api/chat';
import type { DashboardStackParamList } from '@/app/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'ChatConversation'>;

// Matches web's Dashboard.chat.tsx behavior exactly: plain REST polling every 3s, no
// WebSocket — so this needed no protocol change, just a native list + composer.
export function ChatConversationScreen({ route, navigation }: Props) {
  const { conversationId, name } = route.params;
  const { colors, radius: r } = useTheme();
  const { userId } = useCurrentUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    navigation.setOptions({ title: name });
  }, [navigation, name]);

  const load = useCallback(async () => {
    if (!userId) return;
    const msgs = await fetchMessages(userId, conversationId, name);
    setMessages(msgs);
  }, [userId, conversationId, name]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const msg = await sendMessage(userId, conversationId, text);
      setMessages((prev) => [...prev, msg]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMe = item.author === 'You';
          return (
            <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
              <View
                style={[
                  styles.bubble,
                  { borderRadius: r.xl, backgroundColor: isMe ? colors.primary : colors.card, borderColor: colors.border, borderWidth: isMe ? 0 : 1 },
                ]}>
                <Text style={{ color: isMe ? '#fff' : colors.foreground, fontSize: 14 }}>{item.body}</Text>
              </View>
              <Text style={[styles.time, { color: colors.mutedForeground }]}>{item.time}</Text>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${name}`}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground }]}
          multiline
        />
        <Pressable onPress={handleSend} disabled={!draft.trim() || sending} style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: draft.trim() ? 1 : 0.5 }]}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubbleRow: { marginBottom: 12, alignItems: 'flex-start' },
  bubbleRowMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10 },
  time: { fontSize: 10, marginTop: 3 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, padding: 12, gap: 8 },
  input: { flex: 1, fontSize: 14, maxHeight: 100, paddingVertical: 6 },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
});
