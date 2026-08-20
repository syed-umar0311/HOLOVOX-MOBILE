import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export function MeetingRow({ title, date, tag }: { title: string; date: string; tag: string }) {
  return (
    <Pressable style={styles.row}>
      <View style={styles.dot} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <View style={styles.tag}>
        <Text style={styles.tagLabel}>{tag}</Text>
      </View>
    </Pressable>
  );
}

export function PrepItem({ time, title, tag }: { time: string; title: string; tag: string }) {
  return (
    <View style={styles.prepCard}>
      <Text style={styles.prepTime}>{time}</Text>
      <Text style={styles.prepTitle}>{title}</Text>
      <View style={styles.tag}>
        <Text style={styles.tagLabel}>{tag}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.magenta,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  date: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: colors.inkMuted10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  prepCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.canvas,
    padding: 14,
    gap: 6,
    alignItems: 'flex-start',
  },
  prepTime: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.inkMuted40,
  },
  prepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
