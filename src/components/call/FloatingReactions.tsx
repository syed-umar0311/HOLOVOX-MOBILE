import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import type { ReactionEvent } from '@/types/callData';

function FloatingReaction({ reaction }: { reaction: ReactionEvent }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const left = useRef(Math.random() * 70 + 10).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -220, duration: 2800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 2800, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  return (
    <Animated.View style={[styles.floater, { left: `${left}%`, transform: [{ translateY }], opacity }]}>
      <Text style={styles.emoji}>{reaction.emoji}</Text>
    </Animated.View>
  );
}

export function FloatingReactions({ reactions }: { reactions: ReactionEvent[] }) {
  return (
    <View style={styles.container} pointerEvents="none">
      {reactions.map((r) => (
        <FloatingReaction key={r.id} reaction={r} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 0, right: 0, bottom: 90, height: 260 },
  floater: { position: 'absolute', bottom: 0 },
  emoji: { fontSize: 32 },
});
