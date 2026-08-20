import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';
import type { Recording, RecordingType } from '../../types/recordings';

/**
 * Ported from src/components/holovox/Recordings.tsx. Same live endpoints
 * for listing/deleting recordings. Live capture (start/pause/stop, via
 * MediaRecorder + screen/mic permissions) and inline audio/video playback
 * are browser-only with no RN equivalent wired up, so "Play"/"Download"
 * hand off to the device's browser via Linking instead.
 */

const API_BASE_URL = 'https://holovoxserver-production-eb5d.up.railway.app/api/v1';

type FilterTab = 'all' | RecordingType | 'starred';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
  { id: 'screen', label: 'Screen' },
  { id: 'starred', label: 'Starred' },
];

const TYPE_ICON: Record<RecordingType, IconName> = {
  audio: 'audio',
  video: 'meetings',
  screen: 'screen',
};

function mapRecording(item: any): Recording {
  return {
    id: item._id ?? item.id ?? `${item.meetingId ?? 'recording'}_${Math.random()}`,
    title: item.title ?? `Room: ${item.meetingId ?? 'Unknown'}`,
    type: item.type ?? (item.videoUrl ? 'video' : item.audioUrl ? 'audio' : 'screen'),
    duration: item.duration ?? item.length ?? '00:00',
    size: item.size ?? item.fileSize ?? '—',
    date: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Unknown',
    source: item.source ?? 'Manual',
    transcribed: item.transcribed ?? false,
    starred: item.starred ?? false,
    playbackUrl: item.videoUrl ?? item.audioUrl ?? item.fileUrl ?? item.url ?? item.downloadUrl,
  };
}

export function RecordingsPanel({
  isFree,
  userId,
  onUpgrade,
}: {
  isFree: boolean;
  userId?: string;
  onUpgrade?: () => void;
}) {
  const [tab, setTab] = useState<FilterTab>('all');
  const [query, setQuery] = useState('');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    if (!userId) {
      setRecordings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/getRecording/${userId}`);
      const data = await res.json();
      setRecordings(data.success && Array.isArray(data.data) ? data.data.map(mapRecording) : []);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!isFree) fetchRecordings();
  }, [isFree, fetchRecordings]);

  const filtered = useMemo(() => {
    return recordings.filter(r => {
      const matchesTab = tab === 'all' ? true : tab === 'starred' ? Boolean(r.starred) : r.type === tab;
      const q = query.toLowerCase();
      const matchesQuery = !q || r.title.toLowerCase().includes(q) || r.source.toLowerCase().includes(q);
      return matchesTab && matchesQuery;
    });
  }, [recordings, tab, query]);

  const handleDelete = (recording: Recording) => {
    Alert.alert('Delete recording', `Delete "${recording.title}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(recording.id);
          try {
            const res = await fetch(`${API_BASE_URL}/delRecording?recordingId=${recording.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to delete recording');
            setRecordings(prev => prev.filter(r => r.id !== recording.id));
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Could not delete this recording.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const openPlayback = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('Error', "Couldn't open this recording."));
  };

  if (isFree) {
    return (
      <View style={styles.lockCard}>
        <View style={styles.lockIconWrap}>
          <Icon name="lock" size={22} color={colors.magenta} />
        </View>
        <Text style={styles.lockTitle}>
          You&apos;re on the <Text style={styles.lockTitleAccent}>Free plan</Text>
        </Text>
        <Text style={styles.lockBody}>Upgrade to Spark to record, store, and revisit every call.</Text>
        <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
          <Text style={styles.upgradeButtonText}>Upgrade to Spark</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" size={14} color={colors.inkMuted40} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recordings…"
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTER_TABS.map(f => (
          <Pressable key={f.id} style={[styles.filterChip, tab === f.id && styles.filterChipActive]} onPress={() => setTab(f.id)}>
            <Text style={[styles.filterChipLabel, tab === f.id && styles.filterChipLabelActive]} numberOfLines={1}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.magenta} style={styles.loader} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No recordings yet.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filtered.map(r => (
            <View key={r.id} style={styles.row}>
              <View style={styles.rowMain}>
                <View style={styles.iconWrap}>
                  <Icon name={TYPE_ICON[r.type]} size={16} color={colors.magenta} />
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {r.title}
                    </Text>
                    {r.starred ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Starred</Text>
                      </View>
                    ) : null}
                    {r.transcribed ? (
                      <View style={[styles.badge, styles.badgeTranscribed]}>
                        <Text style={[styles.badgeText, styles.badgeTextTranscribed]}>Transcribed</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {r.source} · {r.date} · {r.duration} · {r.size}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={[styles.actionButton, !r.playbackUrl && styles.actionButtonDisabled]}
                  onPress={() => openPlayback(r.playbackUrl)}
                  disabled={!r.playbackUrl}
                  hitSlop={6}
                >
                  <Icon name="play" size={13} color={r.playbackUrl ? colors.ink : colors.inkMuted40} />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, !r.playbackUrl && styles.actionButtonDisabled]}
                  onPress={() => openPlayback(r.playbackUrl)}
                  disabled={!r.playbackUrl}
                  hitSlop={6}
                >
                  <Icon name="download" size={13} color={r.playbackUrl ? colors.ink : colors.inkMuted40} />
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => handleDelete(r)} disabled={deletingId === r.id} hitSlop={6}>
                  <Icon name="trash" size={13} color={colors.inkMuted60} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  upgradeButton: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.3)',
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.magenta,
  },
  container: {
    flex: 1,
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 9,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
  },
  filterChipActive: {
    backgroundColor: colors.magenta,
    borderColor: colors.magenta,
  },
  filterChipLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  filterChipLabelActive: {
    color: colors.card,
    fontWeight: '700',
  },
  loader: {
    paddingVertical: 32,
  },
  empty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
  list: {
    gap: 10,
  },
  row: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 14,
    gap: 12,
  },
  rowMain: {
    flexDirection: 'row',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    flexShrink: 1,
  },
  rowMeta: {
    fontSize: 10,
    color: colors.inkMuted40,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#92400E',
  },
  badgeTranscribed: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeTextTranscribed: {
    color: '#047857',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.inkMuted10,
    paddingTop: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
});
