import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: InputProps) {
  const { colors, radius: r } = useTheme();
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          placeholderTextColor={colors.mutedForeground}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: error ? colors.destructive : colors.border,
              color: colors.foreground,
              borderRadius: r.xl,
              paddingRight: secureToggle ? 56 : 16,
            },
            style,
          ]}
          {...props}
        />
        {secureToggle ? (
          <Pressable style={styles.toggle} onPress={() => setHidden((v) => !v)}>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    paddingVertical: 14,
    paddingLeft: 16,
    fontSize: 15,
  },
  toggle: { position: 'absolute', right: 14 },
  error: { fontSize: 12, marginTop: 4 },
});
