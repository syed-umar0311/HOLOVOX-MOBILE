import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export function GoogleButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.gIcon}>G</Text>
      <Text style={styles.label}>Continue with Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  gIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.cobalt,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
});
