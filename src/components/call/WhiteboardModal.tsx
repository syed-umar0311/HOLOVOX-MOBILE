import React, { useRef, useState } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Polyline } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import type { WhiteboardPoint, WhiteboardSession, WhiteboardStroke, WhiteboardTool } from '@/types/callData';

const COLORS = ['#111827', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
const CANVAS_BG = '#ffffff';

interface Props {
  visible: boolean;
  onClose: () => void;
  session: WhiteboardSession;
  strokes: WhiteboardStroke[];
  isPresenter: boolean;
  localIdentity: string;
  localName: string;
  onStart: () => void;
  onStop: () => void;
  onAddStroke: (stroke: WhiteboardStroke) => void;
  onClear: () => void;
}

// Web broadcasts the whiteboard as a synthetic screen-share video track
// (canvas.captureStream) — that trick has no RN equivalent. This instead sends the
// actual vector strokes over the existing "whiteboard" data-channel topic and renders
// them locally with react-native-svg on every client — arguably a better fit for a
// collaborative whiteboard than the captureStream hack, and it reuses the same wire
// protocol (WHITEBOARD_SESSION/STROKE/CLEAR/REQUEST) web already speaks.
export function WhiteboardModal({
  visible,
  onClose,
  session,
  strokes,
  isPresenter,
  localIdentity,
  localName,
  onStart,
  onStop,
  onAddStroke,
  onClear,
}: Props) {
  const { colors, radius: r } = useTheme();
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(4);
  const currentPoints = useRef<WhiteboardPoint[]>([]);
  const [livePoints, setLivePoints] = useState<WhiteboardPoint[]>([]);

  const canDraw = isPresenter && session.active;

  const pan = Gesture.Pan()
    .enabled(canDraw)
    .onBegin((e) => {
      currentPoints.current = [{ x: e.x, y: e.y }];
      setLivePoints(currentPoints.current);
    })
    .onUpdate((e) => {
      currentPoints.current = [...currentPoints.current, { x: e.x, y: e.y }];
      setLivePoints(currentPoints.current);
    })
    .onEnd(() => {
      if (currentPoints.current.length > 1) {
        onAddStroke({
          id: `${Date.now()}-${Math.random()}`,
          authorId: localIdentity,
          authorName: localName,
          color: tool === 'eraser' ? CANVAS_BG : color,
          size: tool === 'eraser' ? size * 4 : size,
          tool,
          points: currentPoints.current,
        });
      }
      currentPoints.current = [];
      setLivePoints([]);
    });

  const pointsToString = (points: WhiteboardPoint[]) => points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Whiteboard</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>✕</Text>
          </Pressable>
        </View>

        {!session.active ? (
          <View style={styles.center}>
            <Text style={{ color: colors.mutedForeground, marginBottom: 16, textAlign: 'center' }}>
              No one is presenting the whiteboard.
            </Text>
            <Button title="Start whiteboard" onPress={onStart} />
          </View>
        ) : (
          <>
            <View style={[styles.canvasWrap, { borderRadius: r.lg, backgroundColor: CANVAS_BG }]}>
              <GestureDetector gesture={pan}>
                <Svg style={StyleSheet.absoluteFill}>
                  {strokes.map((stroke) => (
                    <Polyline
                      key={stroke.id}
                      points={pointsToString(stroke.points)}
                      fill="none"
                      stroke={stroke.color}
                      strokeWidth={stroke.size}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {livePoints.length > 1 ? (
                    <Polyline
                      points={pointsToString(livePoints)}
                      fill="none"
                      stroke={tool === 'eraser' ? CANVAS_BG : color}
                      strokeWidth={tool === 'eraser' ? size * 4 : size}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </Svg>
              </GestureDetector>
            </View>

            {isPresenter ? (
              <View style={styles.toolbar}>
                <View style={styles.colorRow}>
                  {COLORS.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setTool('pen');
                        setColor(c);
                      }}
                      style={[styles.swatch, { backgroundColor: c, borderColor: color === c && tool === 'pen' ? colors.primary : 'transparent' }]}
                    />
                  ))}
                  <Pressable onPress={() => setTool('eraser')} style={[styles.eraserBtn, { borderColor: tool === 'eraser' ? colors.primary : colors.border }]}>
                    <Text style={{ fontSize: 12 }}>Eraser</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSize((prev) => (prev >= 10 ? 2 : prev + 2))}
                    style={[styles.eraserBtn, { borderColor: colors.border }]}>
                    <Text style={{ fontSize: 12 }}>Size {size}</Text>
                  </Pressable>
                </View>
                <View style={styles.actionsRow}>
                  <Button title="Clear" variant="outline" onPress={onClear} />
                  <Button title="Stop presenting" onPress={onStop} />
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 10, fontSize: 12 }}>
                {session.presenterName} is presenting — view only.
              </Text>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  canvasWrap: { flex: 1, overflow: 'hidden' },
  toolbar: { marginTop: 12 },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  eraserBtn: { paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderRadius: 8 },
  actionsRow: { flexDirection: 'row', gap: 10 },
});
