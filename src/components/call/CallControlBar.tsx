import React, { useState } from 'react';
import { Alert, Pressable, Text, View, StyleSheet } from 'react-native';
import { useLocalParticipant } from '@livekit/components-react';
import { useTheme } from '@/theme/ThemeProvider';

export function CallControlBar({ onLeave }: { onLeave: () => void }) {
  const { colors } = useTheme();
  const { localParticipant } = useLocalParticipant();
  const [busy, setBusy] = useState(false);

  const micEnabled = localParticipant.isMicrophoneEnabled;
  const camEnabled = localParticipant.isCameraEnabled;
  const screenShareEnabled = localParticipant.isScreenShareEnabled;

  const toggleMic = async () => {
    setBusy(true);
    try {
      await localParticipant.setMicrophoneEnabled(!micEnabled);
    } finally {
      setBusy(false);
    }
  };

  const toggleCam = async () => {
    setBusy(true);
    try {
      await localParticipant.setCameraEnabled(!camEnabled);
    } finally {
      setBusy(false);
    }
  };

  const toggleScreenShare = async () => {
    setBusy(true);
    try {
      // Android: the foreground service + MediaProjection consent dialog are handled
      // internally by @livekit/react-native (v2.4.0+) — no extra native picker needed
      // here the way iOS requires (see WhiteboardModal/README for the iOS caveat).
      await localParticipant.setScreenShareEnabled(!screenShareEnabled);
    } catch (err) {
      Alert.alert('Screen share failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ControlButton label={micEnabled ? '🎙️' : '🔇'} tone={micEnabled ? 'neutral' : 'warning'} onPress={toggleMic} disabled={busy} />
      <ControlButton label={camEnabled ? '📷' : '📷🚫'} tone={camEnabled ? 'neutral' : 'warning'} onPress={toggleCam} disabled={busy} />
      <ControlButton label="🖥️" tone={screenShareEnabled ? 'highlight' : 'neutral'} onPress={toggleScreenShare} disabled={busy} />
      <Pressable onPress={onLeave} style={[styles.leaveBtn, { backgroundColor: colors.destructive }]}>
        <Text style={styles.leaveText}>Leave</Text>
      </Pressable>
    </View>
  );
}

type ControlTone = 'neutral' | 'warning' | 'highlight';

function ControlButton({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: ControlTone;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const backgroundColor = tone === 'warning' ? colors.destructive : tone === 'highlight' ? colors.primary : colors.muted;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.circleBtn, { backgroundColor, opacity: disabled ? 0.6 : 1 }]}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  circleBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  leaveBtn: { paddingHorizontal: 22, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  leaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
