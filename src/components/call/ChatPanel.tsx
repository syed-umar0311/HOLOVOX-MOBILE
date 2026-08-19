import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { ChatMessage } from '@/types/callData';

export function ChatPanel({
  visible,
  onClose,
  messages,
  onSend,
  localIdentity,
}: {
  visible: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  localIdentity: string;
}) {
  const { colors, radius: r } = useTheme();
  const [draft, setDraft] = useState('');

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.sheet, { backgroundColor: colors.background, borderTopLeftRadius: r['2xl'], borderTopRightRadius: r['2xl'] }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>In-call chat</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => {
              const isMe = item.senderId === localIdentity;
              return (
                <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
                  {!isMe ? <Text style={[styles.sender, { color: colors.mutedForeground }]}>{item.senderName}</Text> : null}
                  <View
                    style={[
                      styles.bubble,
                      { borderRadius: r.lg, backgroundColor: isMe ? colors.primary : colors.card, borderColor: colors.border, borderWidth: isMe ? 0 : 1 },
                    ]}>
                    <Text style={{ color: isMe ? '#fff' : colors.foreground, fontSize: 13 }}>{item.content}</Text>
                  </View>
                </View>
              );
            }}
          />
          <View style={[styles.composer, { borderColor: colors.border }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message everyone…"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
            />
            <Pressable onPress={handleSend} style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>Send</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%', minHeight: 300, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  list: { flexGrow: 0 },
  bubbleRow: { marginBottom: 10, alignItems: 'flex-start' },
  bubbleRowMe: { alignItems: 'flex-end' },
  sender: { fontSize: 10, marginBottom: 2 },
  bubble: { maxWidth: '80%', paddingHorizontal: 12, paddingVertical: 8 },
  composer: { flexDirection: 'row', gap: 8, borderTopWidth: 1, paddingTop: 10, marginTop: 8 },
  input: { flex: 1, fontSize: 13 },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, alignSelf: 'center' },
});
