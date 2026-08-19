import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { Track } from 'livekit-client';
import { useTracks, isTrackReference } from '@livekit/components-react';
import { VideoTrack } from '@livekit/react-native';
import { useTheme } from '@/theme/ThemeProvider';

// Web's ParticipantGrid.tsx (847 lines) also handles pagination and fullscreen — deferred.
// This covers the two layouts every call needs: an equal grid, and a focused screen-share
// view with a filmstrip of camera tiles, once someone starts sharing.
export function ParticipantGrid() {
  const { colors, radius: r } = useTheme();
  const cameraTracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const screenShareTracks = useTracks([Track.Source.ScreenShare], { onlySubscribed: false });
  const activeScreenShare = screenShareTracks.find((t) => isTrackReference(t) && !t.publication?.isMuted);

  if (activeScreenShare) {
    return (
      <View style={styles.focusContainer}>
        <View style={[styles.focusTile, { backgroundColor: colors.monitor, borderRadius: r.xl }]}>
          <VideoTrack trackRef={activeScreenShare} style={StyleSheet.absoluteFill} objectFit="contain" />
          <View style={styles.labelRow}>
            <Text style={styles.label} numberOfLines={1}>
              {activeScreenShare.participant.name || activeScreenShare.participant.identity}'s screen
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filmstrip} contentContainerStyle={styles.filmstripContent}>
          {cameraTracks.map((trackRef) => (
            <ParticipantTile key={trackRef.participant.identity} trackRef={trackRef} small />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {cameraTracks.map((trackRef) => (
        <ParticipantTile key={trackRef.participant.identity} trackRef={trackRef} />
      ))}
      {cameraTracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={{ color: colors.mutedForeground }}>Waiting for participants…</Text>
        </View>
      ) : null}
    </View>
  );
}

function ParticipantTile({ trackRef, small }: { trackRef: ReturnType<typeof useTracks>[number]; small?: boolean }) {
  const { colors, radius: r } = useTheme();
  const identity = trackRef.participant.identity;
  const name = trackRef.participant.name || identity;
  const hasVideo = isTrackReference(trackRef) && !trackRef.publication?.isMuted;
  const isMuted = !trackRef.participant.isMicrophoneEnabled;

  return (
    <View style={[small ? styles.smallTile : styles.tile, { backgroundColor: colors.monitor, borderRadius: r.xl }]}>
      {hasVideo ? (
        <VideoTrack trackRef={trackRef} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <View style={[styles.avatar, { backgroundColor: colors.primary, width: small ? 32 : 56, height: small ? 32 : 56, borderRadius: small ? 16 : 28 }]}>
            <Text style={[styles.avatarText, { fontSize: small ? 11 : 16 }]}>{name.slice(0, 2).toUpperCase()}</Text>
          </View>
        </View>
      )}
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {name}
          {trackRef.participant.isLocal ? ' (You)' : ''}
        </Text>
        {isMuted ? <Text style={styles.muteIcon}>🔇</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  tile: { width: '50%', aspectRatio: 3 / 4, padding: 6, overflow: 'hidden' },
  focusContainer: { flex: 1, padding: 6 },
  focusTile: { flex: 1, overflow: 'hidden', marginBottom: 6 },
  filmstrip: { maxHeight: 90 },
  filmstripContent: { gap: 6 },
  smallTile: { width: 70, height: 90, overflow: 'hidden' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  labelRow: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: { color: '#fff', fontSize: 11, fontWeight: '600', maxWidth: 120 },
  muteIcon: { fontSize: 11 },
  emptyState: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
});
