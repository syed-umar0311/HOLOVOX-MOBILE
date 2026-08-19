import { useCallback, useEffect, useRef, useState } from 'react';
import { ConnectionState, RoomEvent, type Room, type RemoteParticipant } from 'livekit-client';
import type {
  ChatMessage,
  Poll,
  PollOption,
  ReactionEvent,
  WhiteboardSession,
  WhiteboardStroke,
} from '@/types/callData';
import { emptyWhiteboardSession } from '@/types/callData';

interface PublishOptions {
  reliable: boolean;
  topic: string;
  destinationIdentities?: string[];
}

/** Centralizes the data-channel protocol shared with web's call.$roomId.tsx: same
 * topics (reaction/chat/poll/whiteboard), same payload shapes, same retry-on-transient-
 * error behavior for publishData. RN and web users share the same LiveKit room, so this
 * has to speak the identical wire format, not a new one. */
export function useCallDataChannel(room: Room, localIdentity: string, localName: string, isLocalHost: boolean) {
  const [dataReady, setDataReady] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [myPollSelections, setMyPollSelections] = useState<string[]>([]);
  const [hasVotedPoll, setHasVotedPoll] = useState(false);
  const [whiteboardSession, setWhiteboardSession] = useState<WhiteboardSession>(emptyWhiteboardSession);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);

  const isLocalHostRef = useRef(isLocalHost);
  isLocalHostRef.current = isLocalHost;
  const activePollRef = useRef(activePoll);
  activePollRef.current = activePoll;
  const whiteboardSessionRef = useRef(whiteboardSession);
  whiteboardSessionRef.current = whiteboardSession;
  const whiteboardStrokesRef = useRef(whiteboardStrokes);
  whiteboardStrokesRef.current = whiteboardStrokes;

  useEffect(() => {
    const update = (..._args: unknown[]) => setDataReady(room.state === ConnectionState.Connected);
    update();
    room.on(RoomEvent.Reconnecting, update);
    room.on(RoomEvent.Reconnected, update);
    room.on(RoomEvent.Disconnected, update);
    room.on(RoomEvent.Connected, update);
    return () => {
      room.off(RoomEvent.Reconnecting, update);
      room.off(RoomEvent.Reconnected, update);
      room.off(RoomEvent.Disconnected, update);
      room.off(RoomEvent.Connected, update);
    };
  }, [room]);

  const publish = useCallback(
    async (topic: string, payload: object, destinationIdentities?: string[], attempts = 6) => {
      if (room.state !== ConnectionState.Connected) return;
      const data = Uint8Array.from(new TextEncoder().encode(JSON.stringify(payload)));
      const options: PublishOptions = { reliable: true, topic, ...(destinationIdentities ? { destinationIdentities } : {}) };

      for (let i = 0; i < attempts; i++) {
        try {
          await room.localParticipant.publishData(data, options);
          return;
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const isTransient = message.includes('PC manager is closed') || message.includes('not connected');
          if (!isTransient || i === attempts - 1) throw e;
          await new Promise<void>((resolve) => setTimeout(() => resolve(), 400 * (i + 1)));
        }
      }
    },
    [room],
  );

  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant, _kind?: unknown, topic?: string) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        return;
      }

      if (topic === 'reaction' || data.type === 'REACTION') {
        const id = `${Date.now()}-${Math.random()}`;
        setReactions((prev) => [...prev, { id, emoji: data.emoji as string, sender: (data.sender as string) ?? '' }]);
        setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
        return;
      }

      if (topic === 'chat' || data.type === 'CHAT') {
        setMessages((prev) => [...prev, data as unknown as ChatMessage]);
        return;
      }

      if (topic === 'poll' || (typeof data.type === 'string' && data.type.startsWith('POLL'))) {
        if (data.type === 'POLL_SESSION' && data.poll) {
          setActivePoll(data.poll as Poll);
          setMyPollSelections([]);
          setHasVotedPoll(false);
        } else if (data.type === 'POLL_VOTE' && data.voterId && data.optionIds) {
          setActivePoll((prev) =>
            prev ? { ...prev, votes: { ...prev.votes, [data.voterId as string]: data.optionIds as string[] } } : prev,
          );
        } else if (data.type === 'POLL_CLOSE') {
          setActivePoll(null);
          setMyPollSelections([]);
          setHasVotedPoll(false);
        } else if (data.type === 'POLL_REQUEST' && data.requesterId) {
          if (isLocalHostRef.current && activePollRef.current) {
            void publish('poll', { type: 'POLL_SESSION', poll: activePollRef.current }, [data.requesterId as string]);
          }
        }
        return;
      }

      if (topic === 'whiteboard' || (typeof data.type === 'string' && data.type.startsWith('WHITEBOARD'))) {
        if (data.type === 'WHITEBOARD_SESSION') {
          const incoming = (data.session as WhiteboardSession) ?? emptyWhiteboardSession;
          setWhiteboardSession(incoming);
          if (Array.isArray(data.strokes)) setWhiteboardStrokes(data.strokes as WhiteboardStroke[]);
        } else if (data.type === 'WHITEBOARD_STROKE' && data.stroke) {
          const stroke = data.stroke as WhiteboardStroke;
          setWhiteboardStrokes((prev) => (prev.some((s) => s.id === stroke.id) ? prev : [...prev, stroke]));
        } else if (data.type === 'WHITEBOARD_CLEAR') {
          setWhiteboardStrokes([]);
        } else if (data.type === 'WHITEBOARD_REQUEST' && data.requesterId) {
          if (whiteboardSessionRef.current.active) {
            void publish(
              'whiteboard',
              { type: 'WHITEBOARD_SESSION', session: whiteboardSessionRef.current, strokes: whiteboardStrokesRef.current },
              [data.requesterId as string],
            );
          }
        }
        return;
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, publish]);

  const sendReaction = useCallback(
    (emoji: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setReactions((prev) => [...prev, { id, emoji, sender: localName }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 3000);
      void publish('reaction', { type: 'REACTION', emoji, sender: localName, senderParticipantId: localIdentity });
    },
    [publish, localIdentity, localName],
  );

  const sendChat = useCallback(
    (content: string) => {
      const msg: ChatMessage = { id: Date.now().toString(), senderId: localIdentity, senderName: localName, content, type: 'CHAT' };
      setMessages((prev) => [...prev, msg]);
      void publish('chat', msg);
    },
    [publish, localIdentity, localName],
  );

  const createPoll = useCallback(
    (question: string, optionTexts: string[], multiSelect: boolean) => {
      const now = Date.now();
      const options: PollOption[] = optionTexts.filter(Boolean).map((text, index) => ({ id: `opt-${index}-${now}`, text }));
      const poll: Poll = {
        id: `poll-${now}`,
        question,
        options,
        multiSelect,
        hostId: localIdentity,
        hostName: localName,
        votes: {},
        createdAt: now,
      };
      setActivePoll(poll);
      setMyPollSelections([]);
      setHasVotedPoll(false);
      void publish('poll', { type: 'POLL_SESSION', poll });
    },
    [publish, localIdentity, localName],
  );

  const toggleVoteOption = useCallback((optionId: string, multiSelect: boolean) => {
    setMyPollSelections((prev) => {
      if (multiSelect) return prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId];
      return [optionId];
    });
  }, []);

  const castVote = useCallback(() => {
    if (myPollSelections.length === 0) return;
    setActivePoll((prev) => (prev ? { ...prev, votes: { ...prev.votes, [localIdentity]: myPollSelections } } : prev));
    setHasVotedPoll(true);
    void publish('poll', { type: 'POLL_VOTE', voterId: localIdentity, optionIds: myPollSelections });
  }, [publish, localIdentity, myPollSelections]);

  const closePoll = useCallback(() => {
    void publish('poll', { type: 'POLL_CLOSE' });
    setActivePoll(null);
    setMyPollSelections([]);
    setHasVotedPoll(false);
  }, [publish]);

  const startWhiteboard = useCallback(() => {
    const session: WhiteboardSession = { active: true, presenterId: localIdentity, presenterName: localName, startedAt: Date.now() };
    setWhiteboardSession(session);
    setWhiteboardStrokes([]);
    void publish('whiteboard', { type: 'WHITEBOARD_SESSION', session, strokes: [] });
  }, [publish, localIdentity, localName]);

  const stopWhiteboard = useCallback(() => {
    setWhiteboardSession(emptyWhiteboardSession);
    void publish('whiteboard', { type: 'WHITEBOARD_SESSION', session: emptyWhiteboardSession });
  }, [publish]);

  const addStroke = useCallback(
    (stroke: WhiteboardStroke) => {
      setWhiteboardStrokes((prev) => [...prev, stroke]);
      void publish('whiteboard', { type: 'WHITEBOARD_STROKE', stroke });
    },
    [publish],
  );

  const clearWhiteboard = useCallback(() => {
    setWhiteboardStrokes([]);
    void publish('whiteboard', { type: 'WHITEBOARD_CLEAR' });
  }, [publish]);

  return {
    dataReady,
    messages,
    reactions,
    activePoll,
    myPollSelections,
    hasVotedPoll,
    whiteboardSession,
    whiteboardStrokes,
    sendReaction,
    sendChat,
    createPoll,
    toggleVoteOption,
    castVote,
    closePoll,
    startWhiteboard,
    stopWhiteboard,
    addStroke,
    clearWhiteboard,
  };
}
