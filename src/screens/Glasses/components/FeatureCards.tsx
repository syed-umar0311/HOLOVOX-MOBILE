import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthInput } from '../../../components/AuthInput';
import { colors } from '../../../theme/colors';
import {
  DeviceRequestEvent,
  DisplayResultEvent,
  Glasses,
  GlassesEvents,
  glassesEvents,
  OtaProgressEvent,
} from '../../../native/GlassesModule';
import { reportGlassesError } from '../../../native/glassesErrors';
import { pageFromOffset, totalCodePoints } from '../teleprompterText';
import { SectionCard } from './shared';

const FONT_SIZE = 24;
const SOURCE_LANGUAGE = 0;
const TARGET_LANGUAGE = 1;
const MIC_SOURCE_GLASSES = 1;
const TRANS_STATE_FINAL = 2;

function ActionButton({ label, onPress, tone = 'default' }: { label: string; onPress: () => void; tone?: 'default' | 'danger' }) {
  return (
    <Pressable style={[styles.actionButton, tone === 'danger' && styles.actionButtonDanger]} onPress={onPress}>
      <Text style={[styles.actionButtonLabel, tone === 'danger' && styles.actionButtonLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

export function NotificationsCard() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  return (
    <SectionCard title="Notifications" subtitle="Push a banner notification to the glasses display">
      <AuthInput placeholder="Title" value={title} onChangeText={setTitle} />
      <AuthInput placeholder="Message" value={message} onChangeText={setMessage} />
      <View style={styles.actionRow}>
        <ActionButton
          label="Send to glasses"
          onPress={() => {
            if (!title && !message) return;
            Glasses.sendNotification(0, title, message).catch(reportGlassesError);
          }}
        />
      </View>
    </SectionCard>
  );
}

export function AiAssistantCard() {
  const [content, setContent] = useState('');
  const [active, setActive] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    const subs = [
      glassesEvents.addListener(GlassesEvents.AiRequestFromDevice, (evt: DeviceRequestEvent) => {
        setActive(evt.type === 'start');
      }),
      glassesEvents.addListener(GlassesEvents.AiDisplayResult, (evt: DisplayResultEvent) => {
        setLastResult(`${evt.type}: ${evt.success ? 'ok' : 'failed'}`);
        if (evt.type === 'start') setActive(evt.success);
        if (evt.type === 'stop' && evt.success) setActive(false);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  return (
    <SectionCard title="AI assistant" subtitle="Wake the on-glasses AI overlay and push text to it">
      <AuthInput placeholder="Text to show in the AI overlay" value={content} onChangeText={setContent} />
      <View style={styles.actionRow}>
        <ActionButton label={active ? 'Wake (active)' : 'Wake AI'} onPress={() => Glasses.aiDisplayStart().catch(reportGlassesError)} />
        <ActionButton
          label="Send text"
          onPress={() => content && Glasses.aiDisplaySetContent(0, content).catch(reportGlassesError)}
        />
        <ActionButton label="Stop" tone="danger" onPress={() => Glasses.aiDisplayStop().catch(reportGlassesError)} />
      </View>
      {lastResult ? <Text style={styles.hintText}>{lastResult}</Text> : null}
    </SectionCard>
  );
}

/** Shared by Translation and Transcription — both ride the same Trans display channel;
 * transcription simply leaves sourceText empty, matching the vendor demo app. */
function TransChannelCard({
  title,
  subtitle,
  sourcePlaceholder,
  targetPlaceholder,
  includeSource,
}: {
  title: string;
  subtitle: string;
  sourcePlaceholder: string;
  targetPlaceholder: string;
  includeSource: boolean;
}) {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const sub = glassesEvents.addListener(GlassesEvents.TransRequestFromDevice, () => setStarted(false));
    return () => sub.remove();
  }, []);

  const start = () => {
    Glasses.transDisplayStart(SOURCE_LANGUAGE, TARGET_LANGUAGE, MIC_SOURCE_GLASSES).catch(reportGlassesError);
    Glasses.startAudioRecording().catch(reportGlassesError);
    setStarted(true);
  };

  const send = () => {
    if (!started) return;
    Glasses.transDisplaySetContent(
      TRANS_STATE_FINAL,
      FONT_SIZE,
      SOURCE_LANGUAGE,
      TARGET_LANGUAGE,
      includeSource ? sourceText : '',
      targetText,
    ).catch(reportGlassesError);
  };

  const stop = () => {
    Glasses.stopAudioRecording().catch(reportGlassesError);
    Glasses.transDisplayStop().catch(reportGlassesError);
    setStarted(false);
  };

  return (
    <SectionCard title={title} subtitle={subtitle}>
      {includeSource ? <AuthInput placeholder={sourcePlaceholder} value={sourceText} onChangeText={setSourceText} /> : null}
      <AuthInput placeholder={targetPlaceholder} value={targetText} onChangeText={setTargetText} />
      <Text style={styles.hintText}>
        This SDK streams raw glasses audio but does not include a speech-to-text or translation engine — type the
        text you want shown on the glasses display below.
      </Text>
      <View style={styles.actionRow}>
        <ActionButton label={started ? 'Session active' : 'Start session'} onPress={start} />
        <ActionButton label="Send" onPress={send} />
        <ActionButton label="Stop" tone="danger" onPress={stop} />
      </View>
    </SectionCard>
  );
}

export function TranslationCard() {
  return (
    <TransChannelCard
      title="Translation"
      subtitle="Live translation shown on the glasses display"
      sourcePlaceholder="Original text"
      targetPlaceholder="Translated text"
      includeSource
    />
  );
}

export function TranscriptionCard() {
  return (
    <TransChannelCard
      title="Transcription"
      subtitle="Speech-to-text shown on the glasses display"
      sourcePlaceholder=""
      targetPlaceholder="Transcribed text"
      includeSource={false}
    />
  );
}

export function TeleprompterCard() {
  const [script, setScript] = useState('');
  const [pageSpeed, setPageSpeed] = useState(5);
  const [running, setRunning] = useState(false);
  const scriptRef = useRef('');
  scriptRef.current = script;

  useEffect(() => {
    const subs = [
      glassesEvents.addListener(GlassesEvents.PromptRequestFromDevice, (evt: DeviceRequestEvent) => {
        if (evt.type === 'stop') {
          setRunning(false);
          return;
        }
        if (evt.type === 'askContent') {
          const offset = evt.offset ?? 0;
          const maxBytes = evt.length && evt.length > 0 ? evt.length : 176;
          if (!evt.nextPage) {
            Glasses.promptDisplayReplyAskContent(true).catch(reportGlassesError);
            return;
          }
          const page = pageFromOffset(scriptRef.current, offset, maxBytes);
          if (!page) {
            Glasses.promptDisplayReplyAskContent(true).catch(reportGlassesError);
            return;
          }
          const cursor = offset & 0xffff;
          Glasses.promptDisplaySetContent(FONT_SIZE, pageSpeed, cursor, cursor, page).catch(reportGlassesError);
          Glasses.promptDisplayReplyAskContent(true).catch(reportGlassesError);
        }
      }),
    ];
    return () => subs.forEach(s => s.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSpeed]);

  const start = () => {
    if (!script.trim()) return;
    Glasses.promptDisplayStart(totalCodePoints(script), pageSpeed, true).catch(reportGlassesError);
    setRunning(true);
  };

  const stop = () => {
    Glasses.promptDisplayStop().catch(reportGlassesError);
    setRunning(false);
  };

  return (
    <SectionCard title="Teleprompter" subtitle="Scripted text paged onto the glasses display">
      <AuthInput
        placeholder="Paste or type your script here…"
        value={script}
        onChangeText={setScript}
        multiline
        style={styles.multiline}
      />
      <View style={styles.actionRow}>
        <ActionButton label="− Speed" onPress={() => setPageSpeed(v => Math.max(1, v - 1))} />
        <Text style={styles.hintText}>{pageSpeed}s / page</Text>
        <ActionButton label="+ Speed" onPress={() => setPageSpeed(v => Math.min(15, v + 1))} />
      </View>
      <View style={styles.actionRow}>
        <ActionButton label={running ? 'Running' : 'Start'} onPress={start} />
        <ActionButton label="◀ Prev" onPress={() => Glasses.promptDisplayChangePage(false).catch(reportGlassesError)} />
        <ActionButton label="Next ▶" onPress={() => Glasses.promptDisplayChangePage(true).catch(reportGlassesError)} />
        <ActionButton label="Stop" tone="danger" onPress={stop} />
      </View>
    </SectionCard>
  );
}

export function NavigationCard() {
  const [destination, setDestination] = useState('');
  const [hint, setHint] = useState('');
  const [remainMinutes, setRemainMinutes] = useState('');
  const [remainMeters, setRemainMeters] = useState('');

  useEffect(() => {
    const sub = glassesEvents.addListener(GlassesEvents.NaviRequestFromDevice, () => {});
    return () => sub.remove();
  }, []);

  return (
    <SectionCard title="Navigation" subtitle="Turn-by-turn info pushed to the glasses HUD">
      <AuthInput placeholder="Destination" value={destination} onChangeText={setDestination} />
      <AuthInput placeholder="Next-turn hint (e.g. Turn right in 300m)" value={hint} onChangeText={setHint} />
      <View style={styles.actionRow}>
        <AuthInput
          placeholder="Remaining min"
          value={remainMinutes}
          onChangeText={setRemainMinutes}
          keyboardType="numeric"
          style={styles.smallInput}
        />
        <AuthInput
          placeholder="Remaining m"
          value={remainMeters}
          onChangeText={setRemainMeters}
          keyboardType="numeric"
          style={styles.smallInput}
        />
      </View>
      <View style={styles.actionRow}>
        <ActionButton
          label="Start"
          onPress={() => {
            const totalTimeSec = (parseInt(remainMinutes, 10) || 0) * 60;
            const totalDistanceM = parseInt(remainMeters, 10) || 0;
            Glasses.naviStart(totalTimeSec, totalDistanceM, destination || 'Destination').catch(reportGlassesError);
          }}
        />
        <ActionButton
          label="Update"
          onPress={() => {
            const remainTimeSec = (parseInt(remainMinutes, 10) || 0) * 60;
            const remainDistanceM = parseInt(remainMeters, 10) || 0;
            Glasses.naviInfoUpdate(0, remainTimeSec, remainDistanceM, remainDistanceM, 0, 0, hint).catch(reportGlassesError);
          }}
        />
        <ActionButton label="Stop" tone="danger" onPress={() => Glasses.naviStop().catch(reportGlassesError)} />
      </View>
    </SectionCard>
  );
}

export function OtaCard() {
  const [progress, setProgress] = useState<OtaProgressEvent | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  useEffect(() => {
    const subs = [
      glassesEvents.addListener(GlassesEvents.OtaProgress, (evt: OtaProgressEvent) => setProgress(evt)),
      glassesEvents.addListener(GlassesEvents.FirmwareCheckResult, (evt: { success: boolean; newestVersion: string; currentVersion: string }) => {
        setCheckResult(
          evt.success ? `Current ${evt.currentVersion} · Latest ${evt.newestVersion}` : 'Check failed',
        );
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  return (
    <SectionCard title="Firmware update" subtitle="Check the glasses' firmware version against the SDK's update channel">
      <View style={styles.actionRow}>
        <ActionButton label="Check for update" onPress={() => Glasses.checkFirmwareUpdate(70, '').catch(reportGlassesError)} />
      </View>
      <Text style={styles.hintText}>
        Downloading and applying an update requires a vendor-provided package/URL, which this integration does not
        fabricate — only the safe, read-only version check is wired up here.
      </Text>
      {checkResult ? <Text style={styles.hintText}>{checkResult}</Text> : null}
      {progress ? (
        <Text style={styles.hintText}>
          {progress.channel} {progress.type ?? ''} {progress.progress !== undefined ? `${progress.progress}%` : ''} {progress.message ?? ''}
        </Text>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.magenta,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionButtonDanger: {
    borderColor: colors.destructive,
  },
  actionButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.magenta,
  },
  actionButtonLabelDanger: {
    color: colors.destructive,
  },
  hintText: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  smallInput: {
    flex: 1,
  },
});
