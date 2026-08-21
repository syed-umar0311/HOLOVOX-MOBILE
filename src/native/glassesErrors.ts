import { ToastAndroid } from 'react-native';

/** Native module error codes (see GlassesModule.java) mapped to user-facing copy. */
const FRIENDLY_MESSAGES: Record<string, string> = {
  NOT_BOUND: 'Glasses service is still starting up — please try again in a moment.',
  BLUETOOTH_DISABLED: 'Bluetooth is turned off. Please turn it on to use your glasses.',
  PERMISSION_DENIED: 'Bluetooth permission is required to use your glasses.',
  SCAN_ERROR: 'Could not search for glasses.',
  CONNECT_ERROR: 'Could not connect to the glasses.',
  CONNECT_IN_PROGRESS: 'Already trying to connect — please wait.',
  CONNECT_FAILED: 'Glasses disconnected before the connection finished.',
  CONNECT_CANCELLED: 'Connection attempt was cancelled.',
  SERVICE_LOST: 'Lost connection to the glasses service.',
  NOT_CONNECTED: 'Glasses are not connected.',
  SDK_ERROR: 'That command failed.',
  MODULE_TORN_DOWN: 'App was reloaded — please reconnect your glasses.',
};

export interface NativeErrorLike {
  code?: string;
  message?: string;
}

/** Turns a native module rejection into a short, user-facing message — never a raw stack trace. */
export function friendlyGlassesError(err: unknown): string {
  const e = err as NativeErrorLike;
  if (e && typeof e === 'object' && typeof e.code === 'string' && FRIENDLY_MESSAGES[e.code]) {
    return FRIENDLY_MESSAGES[e.code];
  }
  if (e && typeof e === 'object' && typeof e.message === 'string' && e.message.length < 140) {
    return e.message;
  }
  return 'Something went wrong talking to your glasses.';
}

/** Lightweight, non-blocking error surface for one-off command failures (button taps, toggles). */
export function reportGlassesError(err: unknown) {
  const message = friendlyGlassesError(err);
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[Glasses]', err);
  }
  ToastAndroid.show(message, ToastAndroid.SHORT);
}
