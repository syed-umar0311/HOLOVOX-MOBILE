import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  BatteryChangedEvent,
  ConnectionChangedEvent,
  DeviceInfoEvent,
  Glasses,
  GlassesErrorEvent,
  GlassesEvents,
  ScanResult,
  VersionInfoEvent,
  glassesEvents,
  requestGlassesPermissions,
} from '../native/GlassesModule';
import { friendlyGlassesError } from '../native/glassesErrors';

export type GlassesConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

interface GlassesContextValue {
  supported: boolean;
  glassesMode: boolean;
  enableGlassesMode: () => void;
  disableGlassesMode: () => void;
  connectionState: GlassesConnectionState;
  devices: ScanResult[];
  connectedDeviceId: string | null;
  connectedDeviceName: string | null;
  battery: BatteryChangedEvent | null;
  deviceInfo: DeviceInfoEvent | null;
  versionInfo: VersionInfoEvent | null;
  lastError: string | null;
  /** True when the glasses dropped without the user tapping Disconnect — surface a reconnect CTA. */
  wasUnexpectedDisconnect: boolean;
  lastDevice: ScanResult | null;
  startScan: () => Promise<void>;
  stopScan: () => Promise<void>;
  connectTo: (device: ScanResult) => Promise<void>;
  reconnect: () => Promise<void>;
  disconnect: () => Promise<void>;
  clearError: () => void;
}

const GlassesContext = createContext<GlassesContextValue | undefined>(undefined);

const SUPPORTED = Platform.OS === 'android';

export function GlassesProvider({ children }: { children: React.ReactNode }) {
  const [glassesMode, setGlassesMode] = useState(false);
  const [connectionState, setConnectionState] = useState<GlassesConnectionState>('disconnected');
  const [devices, setDevices] = useState<ScanResult[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [battery, setBattery] = useState<BatteryChangedEvent | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfoEvent | null>(null);
  const [versionInfo, setVersionInfo] = useState<VersionInfoEvent | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [wasUnexpectedDisconnect, setWasUnexpectedDisconnect] = useState(false);
  const [lastDevice, setLastDevice] = useState<ScanResult | null>(null);

  const initialized = useRef(false);
  // True for the brief window between the user tapping Disconnect and the native ack landing —
  // lets us tell "I asked to disconnect" apart from "the glasses just dropped".
  const userInitiatedDisconnect = useRef(false);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    if (!SUPPORTED) return;

    const subs = [
      glassesEvents.addListener(GlassesEvents.ScanResult, (result: ScanResult) => {
        setDevices(prev => (prev.some(d => d.id === result.id) ? prev : [...prev, result]));
      }),
      glassesEvents.addListener(GlassesEvents.ScanFinished, () => {
        setConnectionState(prev => (prev === 'scanning' ? 'disconnected' : prev));
      }),
      glassesEvents.addListener(GlassesEvents.ConnectionChanged, (evt: ConnectionChangedEvent) => {
        if (evt.connected) {
          wasConnectedRef.current = true;
          setConnectionState('connected');
          setConnectedDeviceId(evt.deviceId ?? null);
          setWasUnexpectedDisconnect(false);
        } else {
          const unexpected = wasConnectedRef.current && !userInitiatedDisconnect.current;
          wasConnectedRef.current = false;
          userInitiatedDisconnect.current = false;
          setConnectionState('disconnected');
          setConnectedDeviceId(null);
          setBattery(null);
          setDeviceInfo(null);
          setVersionInfo(null);
          setWasUnexpectedDisconnect(unexpected);
          if (unexpected) {
            setLastError('Your glasses disconnected unexpectedly.');
          }
        }
      }),
      glassesEvents.addListener(GlassesEvents.BatteryChanged, (evt: BatteryChangedEvent) => {
        if (evt.success) setBattery(evt);
      }),
      glassesEvents.addListener(GlassesEvents.DeviceInfo, (evt: DeviceInfoEvent) => {
        if (evt.success) setDeviceInfo(evt);
      }),
      glassesEvents.addListener(GlassesEvents.VersionInfo, (evt: VersionInfoEvent) => {
        if (evt.success) setVersionInfo(evt);
      }),
      glassesEvents.addListener(GlassesEvents.Error, (evt: GlassesErrorEvent) => {
        setLastError(evt.message);
      }),
    ];

    return () => subs.forEach(s => s.remove());
  }, []);

  const ensureInitialized = useCallback(async () => {
    if (!SUPPORTED) throw new Error('AR99 glasses are only supported on Android.');
    if (!initialized.current) {
      await Glasses.initialize();
      initialized.current = true;
    }
  }, []);

  const startScan = useCallback(async () => {
    setLastError(null);
    try {
      const granted = await requestGlassesPermissions();
      if (!granted) {
        setLastError('Bluetooth permission is required to find your AR99 glasses.');
        return;
      }
      await ensureInitialized();
      setDevices([]);
      setConnectionState('scanning');
      await Glasses.scan();
    } catch (err) {
      setConnectionState('disconnected');
      setLastError(friendlyGlassesError(err));
    }
  }, [ensureInitialized]);

  const stopScan = useCallback(async () => {
    try {
      await Glasses.stopScan();
    } catch {
      // no-op — scan may already be finished
    }
    setConnectionState(prev => (prev === 'scanning' ? 'disconnected' : prev));
  }, []);

  const connectTo = useCallback(
    async (device: ScanResult) => {
      setLastError(null);
      setWasUnexpectedDisconnect(false);
      try {
        await stopScan();
        await ensureInitialized();
        setConnectionState('connecting');
        setConnectedDeviceName(device.projName || device.name || 'AR99 Glasses');
        setLastDevice(device);
        await Glasses.connect(device.id);
      } catch (err) {
        setConnectionState('disconnected');
        setLastError(friendlyGlassesError(err));
      }
    },
    [ensureInitialized, stopScan],
  );

  const reconnect = useCallback(async () => {
    if (lastDevice) {
      await connectTo(lastDevice);
    } else {
      await startScan();
    }
  }, [connectTo, lastDevice, startScan]);

  const disconnect = useCallback(async () => {
    userInitiatedDisconnect.current = true;
    setWasUnexpectedDisconnect(false);
    try {
      await Glasses.disconnect();
    } catch (err) {
      setLastError(friendlyGlassesError(err));
    }
    setConnectionState('disconnected');
    setConnectedDeviceId(null);
    setConnectedDeviceName(null);
  }, []);

  const enableGlassesMode = useCallback(() => setGlassesMode(true), []);
  const disableGlassesMode = useCallback(() => {
    setGlassesMode(false);
  }, []);

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo<GlassesContextValue>(
    () => ({
      supported: SUPPORTED,
      glassesMode,
      enableGlassesMode,
      disableGlassesMode,
      connectionState,
      devices,
      connectedDeviceId,
      connectedDeviceName,
      battery,
      deviceInfo,
      versionInfo,
      lastError,
      wasUnexpectedDisconnect,
      lastDevice,
      startScan,
      stopScan,
      connectTo,
      reconnect,
      disconnect,
      clearError,
    }),
    [
      glassesMode,
      enableGlassesMode,
      disableGlassesMode,
      connectionState,
      devices,
      connectedDeviceId,
      connectedDeviceName,
      battery,
      deviceInfo,
      versionInfo,
      lastError,
      wasUnexpectedDisconnect,
      lastDevice,
      startScan,
      stopScan,
      connectTo,
      reconnect,
      disconnect,
      clearError,
    ],
  );

  return <GlassesContext.Provider value={value}>{children}</GlassesContext.Provider>;
}

export function useGlasses(): GlassesContextValue {
  const ctx = useContext(GlassesContext);
  if (!ctx) throw new Error('useGlasses must be used within a GlassesProvider');
  return ctx;
}
