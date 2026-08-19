import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, Vibration, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import { fetchEvents, markEventRead, type AppEvent } from '@/api/events';

function roleLabel(role?: string) {
  return role === 'owner' ? 'Owner' : role === 'manager' ? 'Manager' : 'Rep';
}

/** Global "someone's at your door" popup — polls the same /api/events endpoint as web's
 * KnockPopup.tsx every 15s and surfaces unread "user.knocked" events on its own, the way
 * web mounts it once at the DashboardLayout level. Web also synthesizes a "knock knock"
 * sound via raw Web Audio oscillators — RN has no Web Audio API, so this vibrates instead,
 * a real native notification cue rather than a silent substitute. Sending a knock is
 * enterprise-gated (needs enterpriseApi, not yet built) so only the receiving side is
 * wired here — that's the half that doesn't depend on unbuilt enterprise endpoints. */
export function KnockListener() {
  const { colors, radius: r } = useTheme();
  const { userId, token } = useCurrentUser();
  const navigation = useRootNavigation();
  const [knocks, setKnocks] = useState<AppEvent[]>([]);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const dismissedIds = useRef<Set<string>>(new Set());
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const events = await fetchEvents(userId, token);
        if (cancelled) return;
        const unreadKnocks = events.filter((e) => e.type === 'user.knocked' && !e.isRead && !dismissedIds.current.has(e._id));
        const hasNew = unreadKnocks.some((e) => !seenIds.current.has(e._id));
        unreadKnocks.forEach((e) => seenIds.current.add(e._id));
        if (hasNew) Vibration.vibrate([0, 200, 100, 200]);
        setKnocks(unreadKnocks);
      } catch {
        // best-effort polling — a failed check just tries again in 15s
      }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, token]);

  if (knocks.length === 0 || !userId) return null;

  const current = knocks[0];
  const isInstantMeeting = Boolean(current.metadata?.isInstantMeeting && current.metadata?.roomId);

  const closeKnock = async (eventId: string) => {
    dismissedIds.current.add(eventId);
    setDismissingId(eventId);
    setKnocks((prev) => prev.filter((k) => k._id !== eventId));
    try {
      await markEventRead(userId, eventId);
    } finally {
      setDismissingId(null);
    }
  };

  const handleJoin = async () => {
    const roomId = current.metadata?.roomId;
    if (!roomId) return;
    await closeKnock(current._id);
    navigation.navigate('Call', { roomId });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary + '33', borderRadius: r['2xl'] }]}>
      <Text style={[styles.title, { color: colors.foreground }]}>Someone's at your door</Text>
      <Text style={{ color: colors.foreground, fontSize: 13, marginTop: 6 }}>
        {current.metadata?.fromName || 'Someone'}{' '}
        <Text style={{ color: colors.mutedForeground }}>({roleLabel(current.metadata?.fromRole)})</Text> knocked on your door
      </Text>
      {current.description ? <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>{current.description}</Text> : null}

      <View style={styles.actions}>
        <Pressable disabled={dismissingId === current._id} onPress={() => closeKnock(current._id)} style={[styles.btn, { borderColor: colors.border }]}>
          <Text style={{ color: colors.foreground, fontSize: 12, fontWeight: '600' }}>{isInstantMeeting ? 'Dismiss' : 'Close'}</Text>
        </Pressable>
        {isInstantMeeting ? (
          <Pressable disabled={dismissingId === current._id} onPress={handleJoin} style={[styles.btn, styles.joinBtn, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Join Meeting</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    borderWidth: 1,
    padding: 16,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  title: { fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 },
  btn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  joinBtn: { borderWidth: 0 },
});
