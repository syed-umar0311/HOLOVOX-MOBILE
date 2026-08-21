import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import type { ChatConversation, ChatMessage } from '../../types/chat';

/**
 * Ported from src/Pages/Dashboard.chat.tsx (web ChatPage). Conversation list
 * and message send/poll hit the same live endpoints as the web app. The
 * web page's hover-action toolbar, message context menu, and thread drawer
 * all operate on fields (replies/reactions/pinned) the API never actually
 * populates — dead UI in practice — so they're dropped here. File/image
 * attachments from other senders still render; picking a file to send would
 * need a native picker dependency, so the paperclip/image composer buttons
 * are left out. Side-by-side list+conversation becomes a list → detail push
 * on mobile, same pattern as Meetings.
 */

const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/v1';
const POLL_INTERVAL_MS = 3000;

function initialsOf(name: string): string {
  return name
    .split(/[ ,]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0])
    .join('')
    .toUpperCase();
}

export default function ChatScreen() {
  const { session } = useAuth();
  const isFree = !session?.subscription || session.subscription === 'free';
  const currentUserId = session?.id ?? '';

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isFree || !currentUserId) {
      setLoadingConversations(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/unique-participants/${encodeURIComponent(currentUserId)}`);
        const json = await res.json();
        const parts = Array.isArray(json.participants) ? json.participants : [];
        const convs: ChatConversation[] = parts.map((p: any) => ({
          id: String(p.userId),
          name: p.name || p.email || String(p.userId),
        }));
        if (!cancelled) setConversations(convs);
      } catch (err) {
        console.error('load participants failed', err);
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFree, currentUserId]);

  const activeConversation = useMemo(() => conversations.find(c => c.id === activeId) ?? null, [conversations, activeId]);

  const fetchMessages = useCallback(
    async (senderId: string, receiverId: string) => {
      try {
        const url = new URL(`${API_BASE_URL}/message`);
        url.searchParams.set('senderId', senderId);
        url.searchParams.set('receiverId', receiverId);
        const res = await fetch(url.toString());
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        const opponentName = conversations.find(c => c.id === receiverId)?.name || receiverId;
        const mapped: ChatMessage[] = data.map((m: any) => ({
          id: m._id || m.id || String(Math.random()),
          author: m.sender === senderId ? 'You' : opponentName,
          time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          body: m.text || '',
          fileUrl: m.fileUrl || '',
          fileType: m.fileType || '',
        }));
        setMessages(mapped);
      } catch (err) {
        console.error('fetch messages failed', err);
      }
    },
    [conversations],
  );

  useEffect(() => {
    if (!currentUserId || !activeId) return;
    fetchMessages(currentUserId, activeId);
    const interval = setInterval(() => fetchMessages(currentUserId, activeId), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [currentUserId, activeId, fetchMessages]);

  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    const term = search.toLowerCase();
    return conversations.filter(c => c.name.toLowerCase().includes(term));
  }, [conversations, search]);

  const openConversation = (id: string) => {
    setActiveId(id);
    setMessages([]);
    setView('detail');
  };

  const handleSend = async () => {
    if (!draft.trim() || !activeId || !currentUserId || sending) return;
    setSending(true);
    const text = draft.trim();
    try {
      const res = await fetch(`${API_BASE_URL}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUserId, receiverId: activeId, text }),
      });
      const json = await res.json();
      const msg = json.data || json;
      const newMessage: ChatMessage = {
        id: msg._id || msg.id || String(Math.random()),
        author: 'You',
        time: msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        body: text,
      };
      setMessages(prev => [...prev, newMessage]);
      setDraft('');
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      console.error('send message failed', err);
    } finally {
      setSending(false);
    }
  };

  if (isFree) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockCard}>
          <View style={styles.lockIconWrap}>
            <Icon name="lock" size={22} color={colors.magenta} />
          </View>
          <Text style={styles.lockTitle}>
            You&apos;re on the <Text style={styles.lockTitleAccent}>Free plan</Text>
          </Text>
          <Text style={styles.lockBody}>Upgrade to Spark to message your team directly in HOLOVOX.</Text>
        </View>
      </View>
    );
  }

  if (view === 'detail' && activeConversation) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.detailHeader}>
          <Pressable style={styles.backButton} onPress={() => setView('list')} hitSlop={8}>
            <Icon name="chevronLeft" size={14} color={colors.ink} />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialsOf(activeConversation.name)}</Text>
          </View>
          <Text style={styles.detailName} numberOfLines={1}>
            {activeConversation.name}
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={styles.emptyMessages}>No messages yet. Say hello 👋</Text>
          ) : (
            messages.map(m => {
              const isMe = m.author === 'You';
              return (
                <View key={m.id} style={[styles.messageRow, isMe && styles.messageRowMe]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    {!isMe ? <Text style={styles.bubbleAuthor}>{m.author}</Text> : null}
                    {m.body ? <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{m.body}</Text> : null}
                    {m.fileUrl && m.fileType === 'image' ? (
                      <Image source={{ uri: m.fileUrl }} style={styles.attachmentImage} resizeMode="cover" />
                    ) : m.fileUrl ? (
                      <Pressable onPress={() => Linking.openURL(m.fileUrl!)}>
                        <Text style={[styles.attachmentLink, isMe && styles.bubbleTextMe]}>📎 Open file</Text>
                      </Pressable>
                    ) : null}
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{m.time}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={`Message ${activeConversation.name}`}
            placeholderTextColor={colors.mutedForeground}
            style={styles.composerInput}
            multiline
          />
          <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]} onPress={handleSend} disabled={!draft.trim() || sending}>
            {sending ? <ActivityIndicator size="small" color={colors.card} /> : <Icon name="play" size={13} color={colors.card} />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listHeader}>
        <Text style={styles.title}>Chats</Text>
      </View>

      <View style={styles.searchBar}>
        <Icon name="search" size={14} color={colors.inkMuted40} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations…"
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
        />
      </View>

      {loadingConversations ? (
        <ActivityIndicator color={colors.magenta} style={styles.loader} />
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No conversations yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredConversations.map(c => (
            <Pressable key={c.id} style={styles.conversationRow} onPress={() => openConversation(c.id)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsOf(c.name)}</Text>
              </View>
              <Text style={styles.conversationName} numberOfLines={1}>
                {c.name}
              </Text>
              <Icon name="chevronRight" size={11} color={colors.inkMuted40} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  lockCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
    padding: 24,
  },
  lockIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockTitle: {
    fontSize: 14,
    color: colors.ink,
  },
  lockTitleAccent: {
    fontWeight: '700',
    color: colors.magenta,
  },
  lockBody: {
    marginTop: 6,
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    marginTop: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
  list: {
    padding: 20,
    gap: 4,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.card,
  },
  conversationName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkMuted10,
  },
  backButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
  },
  emptyMessages: {
    marginTop: 32,
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkMuted60,
  },
  messageRow: {
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleThem: {
    backgroundColor: colors.inkMuted10,
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: colors.magenta,
    borderTopRightRadius: 4,
  },
  bubbleAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkMuted60,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  bubbleTextMe: {
    color: colors.card,
  },
  bubbleTime: {
    marginTop: 4,
    fontSize: 9,
    color: colors.inkMuted40,
  },
  bubbleTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  attachmentImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginTop: 6,
  },
  attachmentLink: {
    marginTop: 6,
    fontSize: 12,
    textDecorationLine: 'underline',
    color: colors.cobalt,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.inkMuted10,
    padding: 12,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.inkMuted40,
  },
});
