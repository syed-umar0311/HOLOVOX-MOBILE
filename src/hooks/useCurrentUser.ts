import { useSession } from './useSession';

/** Flattens the handful of shapes user id/email/name show up in across the backend
 * responses (session.user.id vs session.user._id vs session.email, etc.) into one place,
 * mirroring the repeated `getSessionUserId()` / inline fallback chains on web. */
export function useCurrentUser() {
  const { session, loading } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;

  const userId =
    (typeof user?.id === 'string' && user.id) ||
    (typeof user?._id === 'string' && user._id) ||
    session?.id ||
    undefined;

  const email = session?.email;
  const name = session?.name || session?.fullName || email || 'there';
  const subscription = session?.subscription ?? 'free';

  return { session, loading, userId, email, name, token: session?.token, subscription };
}
