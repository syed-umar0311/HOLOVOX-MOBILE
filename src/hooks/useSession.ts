import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { loadSession, SESSION_CHANGED_EVENT } from '@/lib/session';
import type { AuthSession } from '@/types/auth';

/** RN equivalent of the web app's useSession() hook (src/lib/useSession.ts). There,
 * loadSession() is synchronous (localStorage) and the hook just re-runs it on a window
 * event. AsyncStorage is async, so this tracks a loading flag and re-fetches on the same
 * SESSION_CHANGED_EVENT, now emitted via DeviceEventEmitter instead of window.dispatchEvent. */
export function useSession(): { session: AuthSession | null; loading: boolean } {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    loadSession()
      .then(setSession)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = DeviceEventEmitter.addListener(SESSION_CHANGED_EVENT, refresh);
    return () => subscription.remove();
  }, [refresh]);

  return { session, loading };
}
