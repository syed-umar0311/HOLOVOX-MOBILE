import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeProvider';
import { useHoloAssistContext } from '@/contexts/HoloAssistContext';
import { useRootNavigation } from '@/hooks/useRootNavigation';

const SIZE = 56;

/** Draggable floating bubble that launches the HoloAssist chat screen — the RN
 * equivalent of web's HoloBubble.tsx + HoloAssistOverlay.tsx floating widget. Simplified
 * to a launcher rather than an always-mounted in-place chat overlay: same "always
 * reachable, drag it out of the way" behavior, less always-on state to manage. */
export function HoloAssistBubble() {
  const { colors } = useTheme();
  const { showBubble } = useHoloAssistContext();
  const { width, height } = useWindowDimensions();
  const navigation = useRootNavigation();

  const translateX = useSharedValue(width - SIZE - 20);
  const translateY = useSharedValue(height * 0.6);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dragged = useSharedValue(false);

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      dragged.value = false;
    })
    .onUpdate((e) => {
      if (Math.abs(e.translationX) + Math.abs(e.translationY) > 6) dragged.value = true;
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      const snapToRight = translateX.value + SIZE / 2 > width / 2;
      translateX.value = withSpring(snapToRight ? width - SIZE - 12 : 12);
      translateY.value = withSpring(Math.max(60, Math.min(height - SIZE - 100, translateY.value)));
    });

  const tap = Gesture.Tap().onEnd(() => {
    if (!dragged.value) navigation.navigate('Dashboard', { screen: 'HoloAssist' });
  });

  const composed = Gesture.Simultaneous(pan, tap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  if (!showBubble) return null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 8,
            shadowColor: '#000',
            shadowOpacity: 0.3,
            shadowRadius: 8,
            zIndex: 999,
          },
          style,
        ]}>
        <Text style={{ fontSize: 22 }}>✨</Text>
      </Animated.View>
    </GestureDetector>
  );
}
