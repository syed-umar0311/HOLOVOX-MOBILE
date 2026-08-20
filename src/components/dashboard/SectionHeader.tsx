import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function SectionHeader({ title, hint, onSeeAll }: { title: string; hint?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{title}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleRow: {
    gap: 2,
    flexShrink: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: colors.ink,
  },
  hint: {
    fontSize: 11,
    color: colors.inkMuted40,
  },
  seeAll: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.magenta,
  },
});
