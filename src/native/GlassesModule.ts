import { NativeEventEmitter, NativeModules, PermissionsAndroid, Platform } from 'react-native';

/**
 * Thin typed wrapper around the native `GlassesModule` (Android), which itself wraps the
 * AR99 smart glasses SDK (SmartXY / ksdk AAR). Every method here maps 1:1 to a real SDK
 * call — see android/app/src/main/java/com/holovoxmobile/glasses/GlassesModule.java.
 *
 * The SDK's own request/response model is async over BLE: most calls below resolve as soon
 * as the command is written to the glasses, and the actual answer arrives later as one of
 * the events in `GlassesEvents`.
 */

const { GlassesModule: NativeGlasses } = NativeModules;

export interface ScanResult {
  id: string;
  name: string | null;
  projName: string | null;
  projSN: string | null;
  rssi: number;
}

export interface ConnectionChangedEvent {
  connected: boolean;
  deviceId?: string;
}

export interface BatteryChangedEvent {
  success: boolean;
  level: number;
  charging: boolean;
}

export interface DeviceInfoEvent {
  success: boolean;
  productName: string;
  serialNo: string;
  btMac: string;
  version: string;
  firmware: string;
}

export interface VersionInfoEvent {
  success: boolean;
  mcu1: string;
  mcu2: string;
  android: string;
  app: string;
}

export interface BoolStateEvent {
  success: boolean;
  enabled?: boolean;
  worn?: boolean;
  recording?: boolean;
}

export interface IntStateEvent {
  success: boolean;
  value?: number;
  seconds?: number;
}

export interface TouchEvent {
  eventType: number;
  x: number;
  y: number;
}

export interface KeyEvent {
  keyCode: number;
  eventType: number;
}

export interface DeviceRequestEvent {
  type: string;
  nextPage?: boolean;
  offset?: number;
  length?: number;
}

export interface DisplayResultEvent {
  type: string;
  success: boolean;
}

export interface OtaProgressEvent {
  channel: 'bes' | 'android' | 'download';
  type?: string;
  progress?: number;
  message?: string;
  success?: boolean;
}

export interface GlassesErrorEvent {
  code: number;
  message: string;
}

/** Event names emitted by the native module — subscribe with `glassesEvents`. */
export const GlassesEvents = {
  ScanResult: 'GlassesScanResult',
  ScanFinished: 'GlassesScanFinished',
  ConnectionChanged: 'GlassesConnectionChanged',
  DeviceInfo: 'GlassesDeviceInfo',
  VersionInfo: 'GlassesVersionInfo',
  BatteryChanged: 'GlassesBatteryChanged',
  BrightnessChanged: 'GlassesBrightnessChanged',
  AutoBrightnessChanged: 'GlassesAutoBrightnessChanged',
  DoNotDisturbChanged: 'GlassesDoNotDisturbChanged',
  HeadUpChanged: 'GlassesHeadUpChanged',
  WearStateChanged: 'GlassesWearStateChanged',
  AutoSleepChanged: 'GlassesAutoSleepChanged',
  TouchEvent: 'GlassesTouchEvent',
  KeyEvent: 'GlassesKeyEvent',
  AudioRecordChanged: 'GlassesAudioRecordChanged',
  AiRequestFromDevice: 'GlassesAiRequestFromDevice',
  AiDisplayResult: 'GlassesAiDisplayResult',
  TransRequestFromDevice: 'GlassesTransRequestFromDevice',
  TransDisplayResult: 'GlassesTransDisplayResult',
  PromptRequestFromDevice: 'GlassesPromptRequestFromDevice',
  PromptDisplayResult: 'GlassesPromptDisplayResult',
  NaviRequestFromDevice: 'GlassesNaviRequestFromDevice',
  NaviDisplayResult: 'GlassesNaviDisplayResult',
  OtaProgress: 'GlassesOtaProgress',
  FirmwareCheckResult: 'GlassesFirmwareCheckResult',
  FactoryResetResult: 'GlassesFactoryResetResult',
  Error: 'GlassesError',
} as const;

export const glassesEvents = NativeGlasses ? new NativeEventEmitter(NativeGlasses) : new NativeEventEmitter();

function ensureNativeModule(): typeof NativeGlasses {
  if (!NativeGlasses) {
    throw new Error(
      'GlassesModule native module is not available. It is Android-only and requires a development build (not Expo Go).',
    );
  }
  return NativeGlasses;
}

/** Requests the Bluetooth permissions the AR99 SDK needs to scan/connect, per Android version. */
export async function requestGlassesPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  }
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export const Glasses = {
  // Connection
  initialize: (): Promise<void> => ensureNativeModule().initialize(),
  scan: (): Promise<void> => ensureNativeModule().scan(),
  stopScan: (): Promise<void> => ensureNativeModule().stopScan(),
  connect: (deviceId: string): Promise<void> => ensureNativeModule().connect(deviceId),
  disconnect: (): Promise<void> => ensureNativeModule().disconnect(),
  isConnected: (): Promise<boolean> => ensureNativeModule().isConnected(),

  // Device info / battery
  getVersion: (): Promise<void> => ensureNativeModule().getVersion(),
  getDeviceInfo: (): Promise<void> => ensureNativeModule().getDeviceInfo(),
  getBattery: (): Promise<void> => ensureNativeModule().getBattery(),

  // Display
  getBrightness: (): Promise<void> => ensureNativeModule().getBrightness(),
  setBrightness: (value: number): Promise<void> => ensureNativeModule().setBrightness(value),
  getAutoBrightness: (): Promise<void> => ensureNativeModule().getAutoBrightness(),
  setAutoBrightness: (enabled: boolean): Promise<void> => ensureNativeModule().setAutoBrightness(enabled),
  getDoNotDisturb: (): Promise<void> => ensureNativeModule().getDoNotDisturb(),
  setDoNotDisturb: (enabled: boolean): Promise<void> => ensureNativeModule().setDoNotDisturb(enabled),
  getHeadUpDisplay: (): Promise<void> => ensureNativeModule().getHeadUpDisplay(),
  setHeadUpDisplay: (enabled: boolean): Promise<void> => ensureNativeModule().setHeadUpDisplay(enabled),
  getWearDetection: (): Promise<void> => ensureNativeModule().getWearDetection(),
  setWearDetection: (enabled: boolean): Promise<void> => ensureNativeModule().setWearDetection(enabled),
  getAutoSleep: (): Promise<void> => ensureNativeModule().getAutoSleep(),
  setAutoSleep: (seconds: number): Promise<void> => ensureNativeModule().setAutoSleep(seconds),

  // Remote control + audio
  sendKey: (keyCode: number, keyAction: number): Promise<void> => ensureNativeModule().sendKey(keyCode, keyAction),
  sendClick: (clickType: number, x: number, y: number): Promise<void> =>
    ensureNativeModule().sendClick(clickType, x, y),
  startAudioRecording: (): Promise<void> => ensureNativeModule().startAudioRecording(),
  stopAudioRecording: (): Promise<void> => ensureNativeModule().stopAudioRecording(),

  // Notifications
  sendNotification: (appType: number, title: string, content: string): Promise<void> =>
    ensureNativeModule().sendNotification(appType, title, content),

  // AI assistant
  aiDisplayStart: (): Promise<void> => ensureNativeModule().aiDisplayStart(),
  aiDisplayStop: (): Promise<void> => ensureNativeModule().aiDisplayStop(),
  aiDisplaySetContent: (state: number, text: string): Promise<void> =>
    ensureNativeModule().aiDisplaySetContent(state, text),

  // Translation / transcription (transcription = same channel, empty sourceText)
  transDisplayStart: (sourceLan: number, transLan: number, micSource: number): Promise<void> =>
    ensureNativeModule().transDisplayStart(sourceLan, transLan, micSource),
  transDisplaySetContent: (
    state: number,
    fontSize: number,
    sourceLan: number,
    transLan: number,
    sourceText: string,
    targetText: string,
  ): Promise<void> =>
    ensureNativeModule().transDisplaySetContent(state, fontSize, sourceLan, transLan, sourceText, targetText),
  transDisplayStop: (): Promise<void> => ensureNativeModule().transDisplayStop(),

  // Teleprompter
  promptDisplayStart: (totalChars: number, pageSpeedSec: number, autoPage: boolean): Promise<void> =>
    ensureNativeModule().promptDisplayStart(totalChars, pageSpeedSec, autoPage),
  promptDisplaySetContent: (
    fontSize: number,
    pageSpeed: number,
    prevOffset: number,
    curOffset: number,
    text: string,
  ): Promise<void> => ensureNativeModule().promptDisplaySetContent(fontSize, pageSpeed, prevOffset, curOffset, text),
  promptDisplayReplyAskContent: (accepted: boolean): Promise<void> =>
    ensureNativeModule().promptDisplayReplyAskContent(accepted),
  promptDisplayChangePage: (next: boolean): Promise<void> => ensureNativeModule().promptDisplayChangePage(next),
  promptDisplaySetAutoTurnPage: (enabled: boolean): Promise<void> =>
    ensureNativeModule().promptDisplaySetAutoTurnPage(enabled),
  promptDisplaySetPageSpeed: (seconds: number): Promise<void> =>
    ensureNativeModule().promptDisplaySetPageSpeed(seconds),
  promptDisplayStop: (): Promise<void> => ensureNativeModule().promptDisplayStop(),

  // Navigation
  naviStart: (totalTimeSec: number, totalDistanceM: number, destination: string): Promise<void> =>
    ensureNativeModule().naviStart(totalTimeSec, totalDistanceM, destination),
  naviInfoUpdate: (
    directionIconId: number,
    remainTimeSec: number,
    totalDistanceM: number,
    remainDistanceM: number,
    speedKmh: number,
    currentDistanceM: number,
    hintText: string,
  ): Promise<void> =>
    ensureNativeModule().naviInfoUpdate(
      directionIconId,
      remainTimeSec,
      totalDistanceM,
      remainDistanceM,
      speedKmh,
      currentDistanceM,
      hintText,
    ),
  naviStop: (): Promise<void> => ensureNativeModule().naviStop(),

  // OTA / firmware
  checkFirmwareUpdate: (fileType: number, packageName: string): Promise<void> =>
    ensureNativeModule().checkFirmwareUpdate(fileType, packageName),
  downloadFirmwareUpdate: (fileType: number, packageName: string, url: string): Promise<void> =>
    ensureNativeModule().downloadFirmwareUpdate(fileType, packageName, url),
};
