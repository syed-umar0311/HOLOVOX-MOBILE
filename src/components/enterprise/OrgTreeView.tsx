import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { NODE_WIDTH, NODE_HEIGHT } from '@/lib/orgTreeLayout';
import type { OrgNode } from '@/types/enterprise';

// Web's version drags nodes around to reparent them, with all the mouse-event plumbing
// that implies. That interaction was dropped in favor of the picker web's own
// EnterpriseNodeDrawer already offers (see useOrgTree.ts) — lower-risk on a touchscreen
// and no functionality lost. What's kept: pinch-to-zoom + pan-to-scroll the canvas
// (Gesture.Pinch + Gesture.Pan composed via Gesture.Simultaneous) and tap-to-open a node.
export function OrgTreeView({
  nodes,
  edges,
  onSelectNode,
}: {
  nodes: OrgNode[];
  edges: [string, string][];
  onSelectNode: (node: OrgNode) => void;
}) {
  const { colors, radius: r } = useTheme();

  const scale = useSharedValue(0.8);
  const translateX = useSharedValue(20);
  const translateY = useSharedValue(20);
  const savedScale = useSharedValue(0.8);
  const savedTranslateX = useSharedValue(20);
  const savedTranslateY = useSharedValue(20);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.3, Math.min(2.2, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  const maxX = Math.max(600, ...nodes.map((n) => n.x + NODE_WIDTH + 40));
  const maxY = Math.max(600, ...nodes.map((n) => n.y + NODE_HEIGHT + 40));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={composed}>
        <View style={styles.viewport}>
          <Animated.View style={[{ width: maxX, height: maxY }, contentStyle]}>
            <Svg width={maxX} height={maxY} style={StyleSheet.absoluteFill}>
              {edges.map(([parentId, childId], i) => {
                const parent = nodes.find((n) => n.id === parentId);
                const child = nodes.find((n) => n.id === childId);
                if (!parent || !child) return null;
                return (
                  <Line
                    key={i}
                    x1={parent.x + NODE_WIDTH / 2}
                    y1={parent.y + NODE_HEIGHT}
                    x2={child.x + NODE_WIDTH / 2}
                    y2={child.y}
                    stroke={colors.border}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
            {nodes.map((node) => (
              <Pressable
                key={node.id}
                onPress={() => onSelectNode(node)}
                style={[
                  styles.node,
                  {
                    left: node.x,
                    top: node.y,
                    width: NODE_WIDTH,
                    height: NODE_HEIGHT,
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: r.lg,
                  },
                ]}>
                <View style={[styles.avatar, { backgroundColor: node.color }]}>
                  <Text style={styles.avatarText}>{node.initials}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.name, { color: colors.foreground }]}>
                    {node.name}
                  </Text>
                  <Text style={[styles.role, { color: colors.mutedForeground }]}>{node.role}</Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: node.status === 'flag' ? colors.destructive : node.status === 'live' ? colors.chart3 : colors.mutedForeground },
                  ]}
                />
              </Pressable>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
      <View style={[styles.hint, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.full }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Pinch to zoom · drag to pan · tap a person</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  viewport: { flex: 1, overflow: 'hidden' },
  node: {
    position: 'absolute',
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  name: { fontSize: 12, fontWeight: '600' },
  role: { fontSize: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  hint: { position: 'absolute', bottom: 12, alignSelf: 'center', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
});
