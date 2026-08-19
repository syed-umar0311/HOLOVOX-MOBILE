import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

const EMOJIS = ['👍', '❤️', '😂', '👏', '🎉', '🤔'];

export function ReactionBar({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { colors, radius: r } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.full }]}>
      {EMOJIS.map((emoji) => (
        <Pressable key={emoji} onPress={() => onSelect(emoji)} style={styles.btn}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  btn: { padding: 6 },
});
