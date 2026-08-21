import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { useGlasses } from '../../../context/GlassesContext';
import { Glasses, GlassesEvents, glassesEvents, type BoolStateEvent, type IntStateEvent, type KeyEvent, type TouchEvent } from '../../../native/GlassesModule';
import { reportGlassesError } from '../../../native/glassesErrors';
import { InfoRow, SectionCard, ToggleRow } from './shared';

export function ConnectionCard() {
  const { connectedDeviceName, connectedDeviceId, battery, deviceInfo, versionInfo, disconnect } = useGlasses();

  useEffect(() => {
    Glasses.getBattery().catch(reportGlassesError);
    Glasses.getDeviceInfo().catch(reportGlassesError);
    Glasses.getVersion().catch(reportGlassesError);
  }, []);

  return (
    <SectionCard title="Connected glasses">
      <View style={styles.statusRow}>
        <View style={styles.dot} />
        <Text style={styles.statusText}>Connected</Text>
      </View>
      <InfoRow label="Device" value={connectedDeviceName ?? 'AR99 Glasses'} />
      <InfoRow label="Address" value={connectedDeviceId ?? '—'} />
      {battery ? (
        <InfoRow label="Battery" value={`${battery.level}%${battery.charging ? ' · Charging' : ''}`} />
      ) : (
        <InfoRow label="Battery" value="Reading…" />
      )}
      {deviceInfo ? (
        <>
          <InfoRow label="Model" value={deviceInfo.productName || '—'} />
          <InfoRow label="Serial number" value={deviceInfo.serialNo || '—'} />
          <InfoRow label="Firmware" value={deviceInfo.firmware || '—'} />
        </>
      ) : null}
      {versionInfo ? <InfoRow label="MCU version" value={versionInfo.mcu1 || '—'} /> : null}
      <Pressable style={styles.disconnectButton} onPress={disconnect}>
        <Text style={styles.disconnectLabel}>Disconnect</Text>
      </Pressable>
    </SectionCard>
  );
}

const AUTO_SLEEP_OPTIONS: { label: string; seconds: number }[] = [
  { label: '30s', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

export function DisplaySettingsCard() {
  const [brightness, setBrightness] = useState<number | null>(null);
  const [autoBrightness, setAutoBrightness] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [headUp, setHeadUp] = useState(false);
  const [wearDetection, setWearDetection] = useState(false);
  const [autoSleepSeconds, setAutoSleepSeconds] = useState<number | null>(null);

  useEffect(() => {
    const subs = [
      glassesEvents.addListener(GlassesEvents.BrightnessChanged, (evt: IntStateEvent) => {
        if (evt.success && evt.value !== undefined) setBrightness(evt.value);
      }),
      glassesEvents.addListener(GlassesEvents.AutoBrightnessChanged, (evt: BoolStateEvent) => {
        if (evt.success && evt.enabled !== undefined) setAutoBrightness(evt.enabled);
      }),
      glassesEvents.addListener(GlassesEvents.DoNotDisturbChanged, (evt: BoolStateEvent) => {
        if (evt.success && evt.enabled !== undefined) setDoNotDisturb(evt.enabled);
      }),
      glassesEvents.addListener(GlassesEvents.HeadUpChanged, (evt: BoolStateEvent) => {
        if (evt.success && evt.enabled !== undefined) setHeadUp(evt.enabled);
      }),
      glassesEvents.addListener(GlassesEvents.WearStateChanged, (evt: BoolStateEvent) => {
        if (evt.success && evt.worn !== undefined) setWearDetection(evt.worn);
      }),
      glassesEvents.addListener(GlassesEvents.AutoSleepChanged, (evt: IntStateEvent) => {
        if (evt.success && evt.seconds !== undefined) setAutoSleepSeconds(evt.seconds);
      }),
    ];
    Glasses.getBrightness().catch(reportGlassesError);
    Glasses.getAutoBrightness().catch(reportGlassesError);
    Glasses.getDoNotDisturb().catch(reportGlassesError);
    Glasses.getHeadUpDisplay().catch(reportGlassesError);
    Glasses.getWearDetection().catch(reportGlassesError);
    Glasses.getAutoSleep().catch(reportGlassesError);
    return () => subs.forEach(s => s.remove());
  }, []);

  const nudgeBrightness = (delta: number) => {
    const next = Math.max(0, Math.min(100, (brightness ?? 50) + delta));
    setBrightness(next);
    Glasses.setBrightness(next).catch(reportGlassesError);
  };

  return (
    <SectionCard title="Display" subtitle="Brightness, do-not-disturb and screen behaviour">
      <View style={styles.brightnessRow}>
        <Text style={styles.toggleLabelInline}>Brightness</Text>
        <View style={styles.stepper}>
          <Pressable style={styles.stepperButton} onPress={() => nudgeBrightness(-10)}>
            <Text style={styles.stepperLabel}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{brightness ?? '—'}</Text>
          <Pressable style={styles.stepperButton} onPress={() => nudgeBrightness(10)}>
            <Text style={styles.stepperLabel}>+</Text>
          </Pressable>
        </View>
      </View>

      <ToggleRow
        label="Auto brightness"
        description="Let the glasses adjust brightness automatically"
        value={autoBrightness}
        onValueChange={next => {
          setAutoBrightness(next);
          Glasses.setAutoBrightness(next).catch(reportGlassesError);
        }}
      />
      <ToggleRow
        label="Do not disturb"
        value={doNotDisturb}
        onValueChange={next => {
          setDoNotDisturb(next);
          Glasses.setDoNotDisturb(next).catch(reportGlassesError);
        }}
      />
      <ToggleRow
        label="Head-up display"
        description="Turn the screen on when the glasses tilt up"
        value={headUp}
        onValueChange={next => {
          setHeadUp(next);
          Glasses.setHeadUpDisplay(next).catch(reportGlassesError);
        }}
      />
      <ToggleRow
        label="Wear detection"
        value={wearDetection}
        onValueChange={next => {
          setWearDetection(next);
          Glasses.setWearDetection(next).catch(reportGlassesError);
        }}
      />

      <View style={styles.chipGroup}>
        <Text style={styles.toggleLabelInline}>Auto sleep</Text>
        <View style={styles.chipRow}>
          {AUTO_SLEEP_OPTIONS.map(opt => (
            <Pressable
              key={opt.seconds}
              style={[styles.chip, autoSleepSeconds === opt.seconds && styles.chipActive]}
              onPress={() => {
                setAutoSleepSeconds(opt.seconds);
                Glasses.setAutoSleep(opt.seconds).catch(reportGlassesError);
              }}
            >
              <Text style={[styles.chipLabel, autoSleepSeconds === opt.seconds && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SectionCard>
  );
}

export function RemoteControlCard() {
  const [lastTouch, setLastTouch] = useState<TouchEvent | null>(null);
  const [lastKey, setLastKey] = useState<KeyEvent | null>(null);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const subs = [
      glassesEvents.addListener(GlassesEvents.TouchEvent, (evt: TouchEvent) => setLastTouch(evt)),
      glassesEvents.addListener(GlassesEvents.KeyEvent, (evt: KeyEvent) => setLastKey(evt)),
      glassesEvents.addListener(GlassesEvents.AudioRecordChanged, (evt: BoolStateEvent) => {
        if (evt.success && evt.recording !== undefined) setRecording(evt.recording);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, []);

  return (
    <SectionCard title="Touch, keys & audio" subtitle="Remote control and live event status from the glasses">
      <InfoRow label="Last touch" value={lastTouch ? `type ${lastTouch.eventType} @ (${lastTouch.x}, ${lastTouch.y})` : 'None yet'} />
      <InfoRow label="Last key" value={lastKey ? `code ${lastKey.keyCode}, type ${lastKey.eventType}` : 'None yet'} />

      <View style={styles.remoteRow}>
        <Pressable style={styles.remoteButton} onPress={() => Glasses.sendKey(1, 0).catch(reportGlassesError)}>
          <Text style={styles.remoteButtonLabel}>◀ Left</Text>
        </Pressable>
        <Pressable style={styles.remoteButton} onPress={() => Glasses.sendClick(0, 0, 0).catch(reportGlassesError)}>
          <Text style={styles.remoteButtonLabel}>OK</Text>
        </Pressable>
        <Pressable style={styles.remoteButton} onPress={() => Glasses.sendKey(2, 0).catch(reportGlassesError)}>
          <Text style={styles.remoteButtonLabel}>Right ▶</Text>
        </Pressable>
      </View>
      <Pressable style={styles.remoteButtonWide} onPress={() => Glasses.sendClick(1, 0, 0).catch(reportGlassesError)}>
        <Text style={styles.remoteButtonLabel}>Back</Text>
      </Pressable>

      <ToggleRow
        label="Microphone / audio recording"
        description="Tells the glasses to start streaming raw audio over BLE. This build does not decode or play that audio back — no speech-to-text is performed."
        value={recording}
        onValueChange={next => {
          setRecording(next);
          (next ? Glasses.startAudioRecording() : Glasses.stopAudioRecording()).catch(reportGlassesError);
        }}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  disconnectButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.destructive,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  disconnectLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.destructive,
  },
  brightnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelInline: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  stepperValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    minWidth: 28,
    textAlign: 'center',
  },
  chipGroup: {
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.magenta,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  chipLabelActive: {
    color: colors.magenta,
  },
  remoteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  remoteButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  remoteButtonWide: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  remoteButtonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
});
