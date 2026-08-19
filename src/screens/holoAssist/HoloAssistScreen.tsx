import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { sendHoloAssistMessage } from '@/api/holoAssist';

interface Msg {
  id: string;
  from: 'you' | 'holo';
  text: string;
  loading?: boolean;
}

// Text-chat core of web's dashboard.holo-assist.tsx (2748 lines — tabs for overview/
// questionnaire/profile/live/ar/history/personality). The "live" voice-assistant mode
// needs a second audio-capture path running alongside LiveKit's WebRTC session during a
// call — same mic-contention risk flagged for subtitles in Phase 4 — so it's not built
// here. This covers what's safe and real: text chat against the actual
// /api/ai-assistant endpoint, same as web's sendChatMessage.
export function HoloAssistScreen() {
  const { colors, radius: r } = useTheme();
  const { userId } = useCurrentUser();
  const [messages, setMessages] = useState<Msg[]>([
    { id: 'welcome', from: 'holo', text: "Hey, I'm Holo. Ask me anything about your calls, tasks, or account." },
  ]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !userId || sending) return;
    setDraft('');
    setSending(true);
    const loadingId = `${Date.now()}-loading`;
    setMessages((prev) => [...prev, { id: `${Date.now()}-you`, from: 'you', text }, { id: loadingId, from: 'holo', text: 'Thinking…', loading: true }]);
    try {
      const reply = await sendHoloAssistMessage(userId, text);
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: loadingId, from: 'holo', text: reply } : m)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setMessages((prev) => prev.map((m) => (m.id === loadingId ? { id: loadingId, from: 'holo', text: `Error: ${message}` } : m)));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const isMe = item.from === 'you';
          return (
            <View style={[styles.row, isMe && styles.rowMe]}>
              <View
                style={[
                  styles.bubble,
                  { borderRadius: r.xl, backgroundColor: isMe ? colors.primary : colors.card, borderColor: colors.border, borderWidth: isMe ? 0 : 1 },
                ]}>
                <Text style={{ color: isMe ? '#fff' : colors.foreground, fontSize: 14 }}>{item.text}</Text>
              </View>
            </View>
          );
        }}
      />
      <View style={[styles.composer, { borderColor: colors.border }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask Holo…"
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
  row: { marginBottom: 12, alignItems: 'flex-start' },
  rowMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, padding: 12, gap: 8 },
  input: { flex: 1, fontSize: 14, maxHeight: 100, paddingVertical: 6 },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
});
