import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: 'center' }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}
