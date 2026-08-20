import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';

export function StatCard({ label, value, sub, onPress }: { label: string; value: string; sub: string; onPress?: () => void }) {
  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.sub} numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkMuted60,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  sub: {
    fontSize: 10,
    color: colors.inkMuted40,
  },
});
