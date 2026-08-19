import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { base64UrlDecode } from './base64';
import type { ApiRecord, AuthRole, AuthSession, PendingSignupPayload } from '@/types/auth';

const SESSION_KEY = 'HOLOVOX.session';
const TIER_KEY = 'HOLOVOX.tier';
const PENDING_SIGNUP_KEY = 'HOLOVOX.pending.signup';
const PENDING_RESET_KEY = 'HOLOVOX.pending.reset';

export const SESSION_CHANGED_EVENT = 'HOLOVOX:session-changed';

function readSubscriptionClaim(record: ApiRecord): string | undefined {
  const direct = record.subscription;
  if (typeof direct === 'string' && direct.trim()) return direct;
  const legacy = record.Subscription;
  if (typeof legacy === 'string' && legacy.trim()) return legacy;
  return undefined;
}

function readProfilePicture(record: ApiRecord): string | undefined {
  const pic =
    record.ProfilePicture ??
    record.profilePicture ??
    record.picture ??
    record.avatar ??
    (record as ApiRecord).image;
  if (typeof pic === 'string' && pic.trim()) return pic;
  return undefined;
}

export function decodeJwtPayload(token: string): ApiRecord | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as ApiRecord;
  } catch {
    return null;
  }
}

/** Builds a session from a freshly issued JWT, merging in whatever the previous session
 * had for fields the new token's claims don't carry. Mirrors getSessionFromToken in the
 * web app's Auth.tsx so both platforms derive the same session shape from the same token. */
export function getSessionFromToken(token: string, currentSession: AuthSession | null): AuthSession | null {
  const record = decodeJwtPayload(token);
  if (!record) return null;

  const email = typeof record.email === 'string' ? record.email : currentSession?.email;
  const name =
    typeof record.name === 'string' ? record.name : currentSession?.name ?? currentSession?.fullName;
  const role = typeof record.role === 'string' ? (record.role as AuthRole) : currentSession?.role ?? 'user';

  if (!email || !name) return null;

  const subscription = readSubscriptionClaim(record) ?? currentSession?.subscription ?? 'free';

  let profilePicture =
    readProfilePicture(record) ?? currentSession?.ProfilePicture ?? currentSession?.profilePicture ?? undefined;
  if (!profilePicture && record.user && typeof record.user === 'object') {
    profilePicture = readProfilePicture(record.user as ApiRecord) ?? undefined;
  }

  const trialActive = typeof record.trialActive === 'boolean' ? record.trialActive : currentSession?.trialActive ?? false;
  const trialStartDate =
    typeof record.trialStartDate === 'string' ? record.trialStartDate : currentSession?.trialStartDate ?? null;
  const trialEndDate =
    typeof record.trialEndDate === 'string' ? record.trialEndDate : currentSession?.trialEndDate ?? null;
  const trialDays = typeof record.trialDays === 'number' ? record.trialDays : currentSession?.trialDays ?? 0;

  return {
    email,
    name,
    fullName: name,
    role,
    token,
    ts: Date.now(),
    subscription,
    ProfilePicture: profilePicture,
    profilePicture,
    trialActive,
    trialStartDate: trialStartDate ?? undefined,
    trialEndDate: trialEndDate ?? undefined,
    trialDays,
    user: record,
  };
}

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

  const sub = session.subscription ?? 'free';
  const tier = sub === 'enterprise' ? 'enterprise' : sub === 'spark' ? 'spark' : 'free';
  await AsyncStorage.setItem(TIER_KEY, tier);

  DeviceEventEmitter.emit(SESSION_CHANGED_EVENT);
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeMany([SESSION_KEY, TIER_KEY]);
  DeviceEventEmitter.emit(SESSION_CHANGED_EVENT);
}

/** Loads the stored session and re-derives volatile claims (subscription/trial/stripe ids)
 * from the JWT itself, same as loadSession() on web — the token is the source of truth,
 * the persisted session object is just a cache. */
export async function loadSession(): Promise<AuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthSession;

    if (session?.token) {
      const decoded = decodeJwtPayload(session.token);
      if (decoded) {
        if (decoded.subscriptionStatus) session.subscriptionStatus = decoded.subscriptionStatus as string;
        if (decoded.subscriptionEndDate) session.subscriptionEndDate = decoded.subscriptionEndDate as string;
        if (decoded.subscriptionStartDate) session.subscriptionStartDate = decoded.subscriptionStartDate as string;
        if (decoded.stripeSubscriptionId) session.stripeSubscriptionId = decoded.stripeSubscriptionId as string;
        if (decoded.stripeCustomerId) session.stripeCustomerId = decoded.stripeCustomerId as string;
        if (decoded.enterpriseDetails) session.enterpriseDetails = decoded.enterpriseDetails as AuthSession['enterpriseDetails'];

        const claimSubscription = (decoded.Subscription ?? decoded.subscription) as string | undefined;
        if (claimSubscription) {
          session.subscription = claimSubscription;
          if (session.user) session.user.subscription = claimSubscription;
        }

        if (decoded.id) session.id = decoded.id as string;

        const claimProfilePicture = (decoded.image ?? decoded.ProfilePicture ?? decoded.profilePicture) as
          | string
          | undefined;
        if (claimProfilePicture) {
          session.ProfilePicture = claimProfilePicture;
          session.profilePicture = claimProfilePicture;
          if (session.user) {
            session.user.ProfilePicture = claimProfilePicture;
            session.user.profilePicture = claimProfilePicture;
          }
        }

        if (decoded.name) {
          session.name = decoded.name as string;
          if (session.user) session.user.name = decoded.name;
        }
        if (decoded.email) {
          session.email = decoded.email as string;
          if (session.user) session.user.email = decoded.email;
        }
      }
    }

    return session;
  } catch {
    return null;
  }
}

export async function getAuthToken(): Promise<string | null> {
  const session = await loadSession();
  return session?.token ?? null;
}

export async function savePendingSignup(payload: PendingSignupPayload): Promise<void> {
  await AsyncStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(payload));
}

export async function loadPendingSignup(): Promise<PendingSignupPayload | null> {
  const raw = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSignupPayload;
  } catch {
    return null;
  }
}

export async function clearPendingSignup(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
}

export async function savePendingReset(email: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_RESET_KEY, email);
}

export async function loadPendingReset(): Promise<string | null> {
  return AsyncStorage.getItem(PENDING_RESET_KEY);
}

export async function clearPendingReset(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_RESET_KEY);
}

/** On web, every subscription tier's landing page — including enterprise-manager and
 * enterprise-user — is a route nested under the same DashboardLayout (see WebRoute.tsx:
 * /dashboard/enterprise-manager, /dashboard/enterprise-user-dashboard both render inside
 * <Route path="/dashboard" element={<DashboardLayout />}>). So every role lands on the
 * same RN "Dashboard" stack (tabs + chrome + KnockListener + HoloAssist bubble all
 * present regardless of role) rather than a separate bare screen — the Enterprise tab
 * inside that stack self-selects its view by role (see EnterpriseScreen.tsx). */
export function getPostLoginRoute(_session: AuthSession | null): 'Dashboard' {
  return 'Dashboard';
}
