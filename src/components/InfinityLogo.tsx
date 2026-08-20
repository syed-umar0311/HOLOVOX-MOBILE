import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { colors } from '../theme/colors';

type RingColor = 'magenta' | 'cobalt' | 'ink';

const ORBIT_STEPS_PER_RING = 32;

function ringPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  direction: 1 | -1,
) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= ORBIT_STEPS_PER_RING; i++) {
    const angle = startAngle + direction * (i / ORBIT_STEPS_PER_RING) * 2 * Math.PI;
    pts.push({ x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) });
  }
  return pts;
}

/**
 * RN approximation of the web InfinityLogo (src/components/site/InfinityLogo.tsx):
 * two overlapping rings with a void dot that travels a full loop around the
 * left ring then the right ring (the two rings only meet at the top/bottom
 * intersection points, so this reproduces the same figure-8 flow as the
 * original SMIL animateMotion path). Built from plain Views + Animated
 * (no react-native-svg dependency).
 */
export function InfinityLogo({
  size = 96,
  color = 'magenta',
  voidColor = 'ink',
  animated = true,
}: {
  size?: number;
  color?: RingColor;
  voidColor?: RingColor;
  animated?: boolean;
}) {
  const ringColor = colors[color];
  const dotColor = colors[voidColor];

  const ringDiameter = size;
  const borderWidth = Math.max(2, size * 0.156);
  const centerOffset = size * 0.489;
  const containerWidth = size * 1.5;
  const containerHeight = size;
  const dotSize = Math.max(3, size * 0.0856);
  const dotTopOffset = size * 0.344;

  const orbit = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  const { inputRange, xRange, yRange } = useMemo(() => {
    const leftCenter = { x: containerWidth / 2 - centerOffset / 2, y: containerHeight / 2 };
    const rightCenter = { x: containerWidth / 2 + centerOffset / 2, y: containerHeight / 2 };
    const orbitRadius = ringDiameter / 2 - borderWidth / 2;
    const topPoint = { x: containerWidth / 2, y: containerHeight / 2 - dotTopOffset };

    const angleTopFromLeft = Math.atan2(topPoint.y - leftCenter.y, topPoint.x - leftCenter.x);
    const angleTopFromRight = Math.atan2(topPoint.y - rightCenter.y, topPoint.x - rightCenter.x);

    // Matches the web SVG path's sweep flags: left ring sweep=1 (increasing
    // angle), right ring sweep=0 (decreasing angle).
    const leftPts = ringPoints(leftCenter.x, leftCenter.y, orbitRadius, angleTopFromLeft, 1);
    const rightPts = ringPoints(rightCenter.x, rightCenter.y, orbitRadius, angleTopFromRight, -1);
    const points = [...leftPts, ...rightPts.slice(1)];

    return {
      inputRange: points.map((_, i) => i / (points.length - 1)),
      xRange: points.map(p => p.x),
      yRange: points.map(p => p.y),
    };
  }, [containerWidth, containerHeight, centerOffset, ringDiameter, borderWidth, dotTopOffset]);

  useEffect(() => {
    if (!animated) return;
    // Instant reset (0-duration) after each lap: the last orbit point equals
    // the first, so the snap back to t=0 is visually seamless.
    const orbitLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbit, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(orbit, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    // Mirrors the web `infinity-float` keyframe: -10px -> 14px -> -10px over 5s.
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    orbitLoop.start();
    floatLoop.start();
    return () => {
      orbitLoop.stop();
      floatLoop.stop();
    };
  }, [animated, orbit, float]);

  const floatTranslateY = float.interpolate({ inputRange: [0, 1], outputRange: [-10, 14] });
  const dotX = orbit.interpolate({ inputRange, outputRange: xRange });
  const dotY = orbit.interpolate({ inputRange, outputRange: yRange });

  const ringStyle = {
    position: 'absolute' as const,
    width: ringDiameter,
    height: ringDiameter,
    borderRadius: ringDiameter / 2,
    borderWidth,
    borderColor: ringColor,
    top: (containerHeight - ringDiameter) / 2,
  };

  return (
    <Animated.View
      style={{
        width: containerWidth,
        height: containerHeight,
        transform: animated ? [{ translateY: floatTranslateY }] : undefined,
      }}
    >
      <View style={[ringStyle, { left: containerWidth / 2 - centerOffset / 2 - ringDiameter / 2 }]} />
      <View style={[ringStyle, { left: containerWidth / 2 + centerOffset / 2 - ringDiameter / 2 }]} />
      <Animated.View
        style={{
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: dotColor,
          left: animated ? Animated.subtract(dotX, dotSize / 2) : containerWidth / 2 - dotSize / 2,
          top: animated ? Animated.subtract(dotY, dotSize / 2) : containerHeight / 2 - dotTopOffset - dotSize / 2,
        }}
      />
    </Animated.View>
  );
}
