import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';

export function QuickAction({
  icon,
  label,
  onPress,
  highlight,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  highlight?: boolean;
}) {
  return (
    <Pressable style={[styles.container, highlight && styles.highlight]} onPress={onPress}>
      <View style={[styles.iconWrap, highlight && styles.iconWrapHighlight]}>
        <Icon name={icon} size={16} color={highlight ? colors.card : colors.ink} />
      </View>
      <Text style={[styles.label, highlight && styles.labelHighlight]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  highlight: {
    borderColor: 'transparent',
    backgroundColor: colors.magenta,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inkMuted10,
  },
  iconWrapHighlight: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  labelHighlight: {
    color: colors.card,
  },
});
