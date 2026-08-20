import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Coming soon</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.magenta,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.magenta,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: colors.inkMuted60,
    textAlign: 'center',
    lineHeight: 20,
  },
});
