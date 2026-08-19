# HOLOVOX Mobile (React Native CLI, Android)

Native Android port of the HOLOVOX product experience (auth → dashboard → meetings →
enterprise). See `../AGENTS.md` for the web app this is being ported from, and the
migration plan this was built against for full phase-by-phase scope.

**Status: Phase 0–6 complete, Phase 7 (polish/verification) done to the extent possible
without a real device** — see "Phase 7 dry-run findings" below for what that pass caught
and fixed. Subtitles and full meeting recording remain out — see "Known gaps" below, they
hit a real platform limitation, not just unstarted work. See the plan for anything not
covered here (brain-file upload/review, meeting-detail drill-down, admin back-office,
hardware store, marketing site — all explicitly out of scope for this app per the
original scoping conversation).

## Phase 7 dry-run findings

This environment has no Android SDK, so Phase 7 was a static pass: full `tsc`/ESLint
sweep (both clean, 0 errors), a production/minified bundle build (also clean, ~3.7MB),
and a manual audit of the native config against actual code usage. Three real bugs
surfaced this way — listed because they're the kind of thing that would otherwise only
show up as "camera doesn't turn on" or "knock notification is silent" on a real device:

1. **Camera/mic permissions were never actually requested at runtime.** The manifest
   declared `CAMERA`/`RECORD_AUDIO`, but Android 6+ requires a runtime
   `PermissionsAndroid` request before a native module can open them — the WebRTC native
   module expects permissions already granted, it doesn't prompt the way a browser's
   `getUserMedia` does. Without this, joining a call would have silently connected with
   no camera/mic. Fixed: `CallRoomScreen` now requests both before starting the
   token/admission flow, with a proper "permission denied → open Settings" screen instead
   of failing silently.
2. **`KnockListener`'s `Vibration.vibrate()` call had no `VIBRATE` permission declared.**
   Would have silently no-op'd on-device. Fixed in the manifest.
3. **Manifest declared several permissions no code actually exercises yet**
   (`POST_NOTIFICATIONS`, `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`, `READ_CALENDAR`/
   `WRITE_CALENDAR`) — leftover from features that were scoped in Phase 0 but ended up
   using a different approach (Linking/Share instead of native calendar writes, no image
   picker added yet). Trimmed to what's actually used, with comments on when to re-add
   each one.

Also cleaned up: three genuinely-unused dependencies (`@react-native/new-app-screen` —
leftover template demo screen, `react-hook-form` and `uuid` — installed early
anticipating a need that plain `useState` ended up covering everywhere), the app's
display name (`strings.xml` said "HolovoxMobile", now "HOLOVOX" to match branding), and
confirmed no accidental `window`/`document`/`localStorage` references exist anywhere in
`src/` (only in code comments explaining what web's equivalent did).

**Not resolved by this pass** (needs a real device or is out of scope for static
checking):
- The actual Gradle/AGP native build has never run — Metro bundling proves the JS side is
  sound, but native module linking (especially `@livekit/react-native-webrtc` under
  `newArchEnabled=true`, which Reanimated v4 requires) is unverified. If the build fails
  with a duplicate `.so` file error, see the `packagingOptions` fix already documented
  below — that's the single most common snag for this dependency combination.
- Gradle wrapper is on 9.3.1, which needs a modern JDK — confirm the exact minimum
  against your installed AGP version rather than trusting "JDK 17" as gospel; Gradle 9.x's
  floor may be higher.
- App icon is still the default React Native template icon, not HOLOVOX branding. This
  needs real asset generation (adaptive icon layers, round-icon mask preview) that's
  better done in Android Studio's Image Asset Studio from `src/assets/HOLOVOX_Main_Logo_
  White.png` (or a cleaner source mark) than generated blind here.
- Runtime permission flows for camera/mic are now wired (see above), but were only
  verified by reading the code path, not by an actual permission-prompt-then-join click
  test on a device.

### What works now
- Auth: login (email + Google), signup, OTP verify, forgot/reset password
- Dashboard shell: bottom tabs (Home / Meetings / Calendar / Chat / More) + a stack for
  Recordings, Tasks, Skills, Analytics, Settings, Profile
- Home: greeting, meeting-hours stat, upcoming/recent meetings (real data from
  `/getMeeting` and `/analytics`)
- Meetings: upcoming/past list — tapping one joins the real LiveKit call room
- Call room: same admission state machine as web (password / waiting-room / locked /
  denied), live participant grid, mic/camera toggle, leave/end-meeting — all against the
  real `/token`, `/waiting-status`, `/end-meeting` endpoints. The Home screen's "Holo at
  me!" CTA starts an instant call the same way.
- In-call reactions, chat, and polls: same LiveKit data-channel topics and payload shapes
  as web's `call.$roomId.tsx` — RN and web participants interoperate in the same meeting,
  not a separate protocol.
- In-call whiteboard: same data-channel protocol (`WHITEBOARD_SESSION/STROKE/CLEAR/
  REQUEST`) but a different transport than web — strokes are sent as vectors over the
  data channel and rendered with `react-native-svg` on every client, instead of web's
  `canvas.captureStream()`-as-a-screen-share-track trick, which has no RN equivalent.
  This is arguably a better fit for a collaborative whiteboard, not a downgrade.
- Screen share: `localParticipant.setScreenShareEnabled()`. Android's foreground service +
  MediaProjection consent dialog are handled internally by `@livekit/react-native` (v2.4+,
  we're on 2.12) — the only thing this app had to add was the manifest permission (already
  in place from Phase 0). The participant grid switches to a focused screen-share layout
  with a camera filmstrip when someone's sharing, same as any video call app.
- Knock-the-door: polls the same `/api/events` endpoint as web's `KnockPopup.tsx` every
  15s, shows the same "someone's at your door" card with Join/Dismiss (web plays a
  synthesized knock sound via raw Web Audio oscillators — no RN equivalent, so this
  vibrates instead, a real native cue not a silent no-op). *Sending* a knock is now also
  wired (added in Phase 6 once `enterpriseApi` existed) via the org tree's node drawer.
- Still not built: subtitles, meeting recording (see "Known gaps"), and the full pre-join
  screen (device preview, meeting title, invite flow — web's `session.new.tsx`)
- Calendar: agenda list of all meetings + "Add to calendar" (opens Google Calendar link,
  or shares an `.ics` file via the Android share sheet — RN has no browser download API)
- Chat: conversation list + 1:1 messaging with 3s polling, matching web's behavior exactly
- Recordings: list/playback-link/delete (capturing a *new* recording is a Phase-later
  item — screen+cam+mic mixing has no direct RN equivalent, see "Known gaps" below)
- Tasks: list, filter, toggle complete — real endpoint calls
- Skills: local toggle list (matches web — it's local-only there too, no backend)
- Analytics (InsightHub): stat tiles + a calls-per-day bar chart from real data
- Settings: notification toggles (local, same as web), billing summary, free-trial start,
  sign out
- Profile: view profile, change/set password (avatar upload deferred — needs an image
  picker dependency not yet added)
- HoloAssist: a draggable floating bubble (launcher, not an always-mounted overlay — see
  code comment) opens a text chat screen against the real `/api/ai-assistant` endpoint,
  same request shape as web's `sendChatMessage`. Web's "live" voice-assistant mode during
  a call was **not** built — it needs the same second-audio-capture-path-alongside-
  LiveKit risk flagged for subtitles below. TTS playback of replies also isn't wired
  (needs an audio-playback dependency not yet added).
- Enterprise (owner/manager/rep, role-gated by subscription tier): Overview (KPIs,
  leaderboard, activity feed), Org tree (pinch-zoom/pan canvas, tap a person for details —
  drag-to-reparent was replaced with a tap-to-select manager picker, the same mechanism
  web's own `EnterpriseNodeDrawer` already offers as an alternative to dragging, just
  promoted to the only path since raw drag gestures are a worse fit for a touchscreen),
  Coach's Corner (flag pipeline: flagged → manager_review → rep_coached → repaired →
  resolved, advance-stage action), Compliance (watchword list, add/remove), Performance
  (per-person radar chart using `orgPerformance.ts`'s scoring engine ported unchanged),
  ROI & Construct (session count + launch). Knock-the-door *sending* is now wired too
  (Phase 4 only had receiving) via the org tree's "Knock the door" action.
- Not built: brain-file upload/suggestion review, meeting-detail drill-down, PDF export
  of coaching flags (web uses `jsPDF`; no native PDF dependency has been added — this
  needs a decision on Share-as-text vs. a real PDF library before it's worth building)

## Stack

- React Native 0.86.2, TypeScript, React Navigation (native-stack)
- `react-native-gesture-handler` + `react-native-reanimated` v4 (for future org-tree /
  drag interactions)
- `react-native-config` for env vars, `@react-native-async-storage/async-storage` for
  session persistence, `@react-native-google-signin/google-signin` for Google auth
- `@livekit/react-native` + `@livekit/react-native-webrtc` + `livekit-client` for the call
  room (needs `LiveKitReactNative.setup(...)` in `MainApplication.kt`, already wired, and
  `registerGlobals()` in `index.js`, already wired). `@livekit/components-react` is also
  installed — LiveKit's RN SDK reuses its headless hooks (`useTracks`, `useRoomContext`,
  etc.); its `react-dom` peer dependency doesn't matter here since only the non-DOM hooks
  are imported, but `npm install` needs `--legacy-peer-deps` if you ever reinstall it

## First-time setup

1. **Android SDK + JDK.** Install Android Studio (includes the SDK). RN 0.86 needs
   **JDK 17**. Set environment variables (Windows, System Properties → Environment
   Variables):
   - `JAVA_HOME` → your JDK 17 install (e.g. the one bundled with Android Studio at
     `...\Android\Android Studio\jbr`)
   - `ANDROID_HOME` → your Android SDK path (e.g. `%LOCALAPPDATA%\Android\Sdk`) — **not**
     a JDK path
   - Add `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\emulator` to `PATH`
   - Verify with `java -version` and `adb --version` in a fresh terminal

2. **Environment file.** `.env` already exists with public (non-secret) defaults copied
   from `.env.example`. Edit values as needed — after any change you must fully rebuild
   (`react-native-config` bakes values into the native build, a Metro reload isn't
   enough):
   ```
   cd android && ./gradlew clean && cd ..
   npx react-native run-android
   ```

3. **Google Sign-In.** The `.env` default `GOOGLE_WEB_CLIENT_ID` is the same web OAuth
   client the existing web app uses. For Google Sign-In to actually complete on Android
   you additionally need an **Android** OAuth client registered in Google Cloud Console
   against this app's package name (`com.holovoxmobile`) and debug/release SHA-1
   fingerprint (`cd android && ./gradlew signingReport` to get it). Without that
   registration the button is wired correctly but Google will reject the sign-in.

4. **Install dependencies** (already done if you're continuing this session):
   ```
   npm install
   ```

5. **If the Android build fails with a duplicate native library error** (e.g. `More than
   one file was found with OS independent path 'lib/x86/libc++_shared.so'`) — this is a
   known, common issue with `react-native-webrtc`-based projects, not specific to this
   app. Fix by adding to `android/app/build.gradle`'s `android {}` block:
   ```groovy
   packagingOptions {
       pickFirst '**/*.so'
   }
   ```
   This hasn't been hit in this environment (no Android SDK available here to run a real
   build) — flagging pre-emptively since it's the most common LiveKit-RN-on-Android
   build snag.

## Running

```
npx react-native start        # Metro bundler, separate terminal
npx react-native run-android  # builds + installs + launches on emulator/device
```

Or open `android/` in Android Studio directly and run from there.

## Project layout

```
src/
  api/        fetch-based service layer — auth, dashboard (meetings/tasks/analytics-hours),
              recordings, chat, profile, settings (billing), analytics, calendar, meeting
              (LiveKit token/waiting-room/end-meeting), events (knock notifications),
              enterpriseApi (org tree/flags/flag-words/construct sessions/knock),
              holoAssist (AI chat)
  app/        RootNavigator, AuthNavigator, DashboardStackNavigator, DashboardTabs
              + navigation param types (types.ts)
  components/
    ui/       themed primitives (Button, Input, Card, Screen, StatCard, EmptyState)
    call/     ParticipantGrid, CallControlBar, ReactionBar, FloatingReactions,
              ChatPanel, PollPanel, WhiteboardModal
    enterprise/  OrgTreeView (pinch/pan gesture canvas), NodeDrawer, RadarChart
    KnockListener.tsx     global "someone's at your door" popup (mounted in
              DashboardStackNavigator, mirrors web's <KnockPopup /> mount point)
    HoloAssistBubble.tsx  draggable floating launcher (mounted alongside KnockListener)
  config/     env.ts — typed wrapper around react-native-config
  contexts/   HoloAssistContext (bubble visibility, ported from web's context of the same name)
  hooks/      useSession, useCurrentUser, useRootNavigation, useCallDataChannel
              (reactions/chat/poll/whiteboard data-channel protocol + state), useOrgTree
  lib/        session.ts (AsyncStorage session store, ported from web's Auth.tsx),
              base64.ts (manual JWT decode — Hermes has no reliable atob),
              calendar-links.ts (ported from web's calendar-links.ts almost unchanged),
              meetingHost.ts (host-resolution identity matching, ported from
              call.$roomId.tsx almost unchanged), enterpriseKnock.ts (ported unchanged),
              orgPerformance.ts (scoring engine, ported unchanged — pure TS),
              orgTreeLayout.ts (tree layout math, ported unchanged — pure TS)
  screens/
    auth/       Login, Signup, Otp, ForgotPassword, ResetPassword
    dashboard/  Home, Meetings, Calendar, Chat, ChatConversation, More, Recordings,
                Tasks, Skills, Analytics, Settings, Profile
    call/       CallRoomScreen (admission state machine + LiveKitRoom)
    enterprise/ EnterpriseScreen (role-gated tab shell) + Overview/Org/Coach/
                Compliance/Performance/Roi sub-screens
    holoAssist/ HoloAssistScreen (text chat)
  theme/      tokens.ts (colors/radius mirrored from web's index.css oklch tokens),
              ThemeProvider.tsx
  types/      auth.ts, react-native-config.d.ts, callData.ts, enterprise.ts, global.d.ts
```

## Known gaps flagged for later phases (not silently mocked)

- **Full mixed meeting recording** (screen+cam+mic) has no direct RN equivalent — plan is
  to use LiveKit server-side Egress instead of a client-side recorder. No confirmed
  backend endpoint for triggering Egress exists yet in what was inspected from the web
  app, so this isn't wired to a guessed URL — needs a real backend endpoint first.
- **Subtitles/live captions were deliberately left out of this pass**, not just
  deprioritized: web's approach (chunked local-mic `MediaRecorder` recording uploaded to
  `/api/ai-assistant/subtitles` every ~2.5s) needs a second, independent audio-capture
  path running *alongside* LiveKit's own WebRTC audio session on the same microphone.
  On Android that's a real resource-contention risk (two capture sessions competing for
  the mic) that could degrade or break actual call audio — a regression in core
  functionality — and it's not something I can verify safely without a real device to
  test on. Adding a new native audio-recording dependency on top of an unverified native
  build felt like the wrong tradeoff. Once the app can be run on-device, this is worth
  revisiting with a controlled test rather than shipped blind. Remote-participant
  captions have no RN equivalent regardless (browser `MediaRecorder` per remote track) —
  that half needs a server-side transcription path no matter what.
- See the migration plan for the full phase list.
