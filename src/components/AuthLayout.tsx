import React, { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { InfinityLogo } from './InfinityLogo';
import { colors } from '../theme/colors';

export function AuthLayout({
  title,
  onBack,
  children,
}: PropsWithChildren<{ title: string; onBack?: () => void }>) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backLink} hitSlop={8}>
            <Text style={styles.backText}>{'← Back'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <View style={styles.header}>
            <InfinityLogo size={36} color="magenta" voidColor="ink" />
            <View style={styles.headerText}>
              <Text style={styles.betaLabel}>{'✦ Beta access'}</Text>
              <Text style={styles.title}>{title}</Text>
            </View>
          </View>

          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  backLink: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: colors.inkMuted60,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  headerText: {
    flexShrink: 1,
  },
  betaLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.magenta,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
