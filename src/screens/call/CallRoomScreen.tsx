import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, PermissionsAndroid, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import { AudioSession } from '@livekit/react-native';
import type { RoomOptions } from 'livekit-client';
import { VideoPresets } from 'livekit-client';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { requestJoinToken, fetchWaitingStatus, endMeeting, deleteMicrophoneAudio } from '@/api/meeting';
import { resolveIsMeetingHost } from '@/lib/meetingHost';
import { Button } from '@/components/ui/Button';
import { ParticipantGrid } from '@/components/call/ParticipantGrid';
import { CallControlBar } from '@/components/call/CallControlBar';
import { ReactionBar } from '@/components/call/ReactionBar';
import { FloatingReactions } from '@/components/call/FloatingReactions';
import { ChatPanel } from '@/components/call/ChatPanel';
import { PollPanel } from '@/components/call/PollPanel';
import { WhiteboardModal } from '@/components/call/WhiteboardModal';
import { useCallDataChannel } from '@/hooks/useCallDataChannel';
import type { RootStackParamList } from '@/app/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>;

type AdmissionStatus = 'idle' | 'password' | 'waiting' | 'admitted' | 'denied' | 'locked' | 'error';

const roomOptions: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h720, VideoPresets.h360],
  },
};

// Ported from call.$roomId.tsx's CallRoomWrapper: same admission state machine
// (idle → password/waiting/admitted/denied/locked), same /token + /waiting-status
// polling contract, same data-channel protocol for reactions/chat/polls/whiteboard.
// Screen share, subtitles, recording, and knock-the-door remain deferred.
export function CallRoomScreen({ route, navigation }: Props) {
  const { roomId } = route.params;
  const { colors } = useTheme();
  const { session, userId, name } = useCurrentUser();
  const tokenFetchedRef = useRef(false);

  const [status, setStatus] = useState<AdmissionStatus>('idle');
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [isLocalHost, setIsLocalHost] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'checking' | 'granted' | 'denied'>('checking');

  const currentUserId = userId ?? `guest_${Math.floor(Math.random() * 10000)}`;

  // The native WebRTC module expects camera/mic permissions to already be granted before
  // it opens them — it doesn't prompt on its own the way a browser's getUserMedia does.
  // Without this, joining would silently connect with no camera/mic on Android 6+.
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'android') {
        setPermissionStatus('granted');
        return;
      }
      try {
        const results = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        const granted = Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
        setPermissionStatus(granted ? 'granted' : 'denied');
      } catch {
        setPermissionStatus('denied');
      }
    })();
  }, []);

  useEffect(() => {
    if (status !== 'admitted') return;
    let cancelled = false;
    resolveIsMeetingHost(roomId, currentUserId, session).then((host) => {
      if (!cancelled) setIsLocalHost(host);
    });
    return () => {
      cancelled = true;
    };
  }, [status, roomId, currentUserId, session]);

  // Configures the native audio session (mic/speaker routing) for the lifetime of this
  // screen — required by @livekit/react-native, otherwise audio I/O doesn't route
  // correctly on-device.
  useEffect(() => {
    AudioSession.startAudioSession();
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  useEffect(() => {
    if (tokenFetchedRef.current || !userId || permissionStatus !== 'granted') return;
    tokenFetchedRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const isHost = await resolveIsMeetingHost(roomId, currentUserId, session);
        const result = await requestJoinToken({
          roomId,
          userId: currentUserId,
          name: String(name),
          isHost,
          image: session?.ProfilePicture,
        });
        if (cancelled) return;

        if (result.status === 'admitted') {
          setToken(result.token);
          setServerUrl(result.url);
          setStatus('admitted');
        } else {
          setStatus(result.status === 'invalid_password' ? 'password' : (result.status as AdmissionStatus));
          if (result.status === 'invalid_password') setPasswordError('Incorrect password. Try again.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, currentUserId, userId, name, session, permissionStatus]);

  useEffect(() => {
    if (status !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        const waitStatus = await fetchWaitingStatus(roomId, currentUserId);
        if (waitStatus === 'admitted') {
          clearInterval(interval);
          const result = await requestJoinToken({ roomId, userId: currentUserId, name: String(name), isHost: false });
          if (result.status === 'admitted') {
            setToken(result.token);
            setServerUrl(result.url);
            setStatus('admitted');
          }
        } else if (waitStatus === 'denied') {
          clearInterval(interval);
          setStatus('denied');
        } else if (waitStatus === 'locked') {
          clearInterval(interval);
          setStatus('locked');
        }
      } catch {
        // keep polling — a transient network blip shouldn't kick the user to an error screen
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, roomId, currentUserId, name]);

  const handleSubmitPassword = async () => {
    if (!password.trim()) return;
    setSubmittingPassword(true);
    setPasswordError(null);
    try {
      const isHost = await resolveIsMeetingHost(roomId, currentUserId, session);
      const result = await requestJoinToken({
        roomId,
        userId: currentUserId,
        name: String(name),
        isHost,
        password: password.trim(),
      });
      if (result.status === 'invalid_password') {
        setPasswordError('Incorrect password. Please try again.');
      } else if (result.status === 'locked') {
        setStatus('locked');
      } else if (result.status === 'waiting') {
        setStatus('waiting');
      } else if (result.status === 'admitted') {
        setToken(result.token);
        setServerUrl(result.url);
        setStatus('admitted');
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not verify password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleLeave = async () => {
    try {
      const isGuest = session?.role === 'guest' || !session?.token;
      await endMeeting(roomId, isGuest ? { participantToken: session?.token } : { userId: currentUserId });
      await deleteMicrophoneAudio(currentUserId);
    } catch {
      // best-effort — still navigate away even if the backend call fails
    } finally {
      navigation.goBack();
    }
  };

  if (permissionStatus === 'checking') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.destructive }]}>Camera & microphone access needed</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
          HOLOVOX needs camera and microphone permission to join a call. Enable them in Settings and try again.
        </Text>
        <View style={{ marginTop: 20, gap: 10, width: '100%' }}>
          <Button title="Open Settings" onPress={() => Linking.openSettings()} />
          <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (status === 'password') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>This meeting requires a password</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, marginBottom: 20, textAlign: 'center' }}>
          Enter the password the host shared with you.
        </Text>
        <TextInput
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setPasswordError(null);
          }}
          secureTextEntry
          placeholder="Meeting password"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
        />
        {passwordError ? <Text style={{ color: colors.destructive, fontSize: 12, marginTop: 8 }}>{passwordError}</Text> : null}
        <View style={{ marginTop: 16, width: '100%' }}>
          <Button title="Continue" onPress={handleSubmitPassword} loading={submittingPassword} disabled={!password.trim()} />
        </View>
      </View>
    );
  }

  if (status === 'waiting') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Waiting for the host to let you in</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
          You'll join automatically once admitted.
        </Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.destructive }]}>Access denied</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8 }}>The host didn't admit you to this meeting.</Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (status === 'locked') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.destructive }]}>This meeting is locked</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
          The host has locked the meeting. Please try again later.
        </Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.destructive }]}>Connection error</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>{error}</Text>
        <View style={{ marginTop: 20 }}>
          <Button title="Go back" variant="outline" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (!token || !serverUrl) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.mutedForeground, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
          Connecting to HOLOVOX…
        </Text>
      </View>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      video
      audio
      options={roomOptions}
      onDisconnected={() => navigation.goBack()}
      onError={(err) => Alert.alert('Connection error', err.message)}
      style={{ flex: 1 }}>
      <RoomAudioRenderer />
      <CallRoomInner onLeave={handleLeave} isLocalHost={isLocalHost} localName={String(name)} />
    </LiveKitRoom>
  );
}

function CallRoomInner({ onLeave, isLocalHost, localName }: { onLeave: () => void; isLocalHost: boolean; localName: string }) {
  const { colors } = useTheme();
  const room = useRoomContext();
  const localIdentity = room.localParticipant.identity || localName;
  const data = useCallDataChannel(room, localIdentity, localName, isLocalHost);

  const [chatOpen, setChatOpen] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);

  const isPresenter = data.whiteboardSession.active && data.whiteboardSession.presenterId === localIdentity;

  const handleLeavePress = async () => {
    await room.disconnect();
    await onLeave();
  };

  return (
    <View style={[styles.roomContainer, { backgroundColor: colors.background }]}>
      <ParticipantGrid />
      <FloatingReactions reactions={data.reactions} />

      <View style={styles.toolRow}>
        <ToolButton label="💬" badge={data.messages.length} onPress={() => setChatOpen(true)} />
        <ToolButton label="📊" onPress={() => setPollOpen(true)} active={!!data.activePoll} />
        <ToolButton label="🖊️" onPress={() => setWhiteboardOpen(true)} active={data.whiteboardSession.active} />
      </View>

      <View style={styles.reactionRow}>
        <ReactionBar onSelect={data.sendReaction} />
      </View>

      <CallControlBar onLeave={handleLeavePress} />

      <ChatPanel visible={chatOpen} onClose={() => setChatOpen(false)} messages={data.messages} onSend={data.sendChat} localIdentity={localIdentity} />
      <PollPanel
        visible={pollOpen}
        onClose={() => setPollOpen(false)}
        isLocalHost={isLocalHost}
        activePoll={data.activePoll}
        mySelections={data.myPollSelections}
        hasVoted={data.hasVotedPoll}
        onCreate={data.createPoll}
        onToggleSelection={data.toggleVoteOption}
        onCastVote={data.castVote}
        onClosePoll={data.closePoll}
      />
      <WhiteboardModal
        visible={whiteboardOpen}
        onClose={() => setWhiteboardOpen(false)}
        session={data.whiteboardSession}
        strokes={data.whiteboardStrokes}
        isPresenter={isPresenter}
        localIdentity={localIdentity}
        localName={localName}
        onStart={data.startWhiteboard}
        onStop={data.stopWhiteboard}
        onAddStroke={data.addStroke}
        onClear={data.clearWhiteboard}
      />
    </View>
  );
}

function ToolButton({ label, onPress, badge, active }: { label: string; onPress: () => void; badge?: number; active?: boolean }) {
  const { colors, radius: r } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toolBtn,
        { backgroundColor: active ? colors.primary : colors.card, borderColor: colors.border, borderRadius: r.full },
      ]}>
      <Text style={{ fontSize: 18 }}>{label}</Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
          <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  roomContainer: { flex: 1 },
  toolRow: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 8 },
  toolBtn: { width: 40, height: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  reactionRow: { alignItems: 'center', marginBottom: 8 },
});
