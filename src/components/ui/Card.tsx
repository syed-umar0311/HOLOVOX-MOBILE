import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ style, ...props }: ViewProps) {
  const { colors, radius: r } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: r['2xl'],
          borderWidth: 1,
          borderColor: colors.border,
          padding: 24,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 3,
        },
        style,
      ]}
      {...props}
    />
  );
}
