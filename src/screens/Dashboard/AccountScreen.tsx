import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';

const MENU_ITEMS = ['Plans & Upgrade', 'Profile', 'Settings'];

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  assist: 'Assist',
  spark: 'Spark',
  enterprise: 'Enterprise',
  'enterprise-user': 'Enterprise · Member',
  'enterprise-manager': 'Enterprise · Manager',
};

export default function AccountScreen() {
  const { session, signOut } = useAuth();
  if (!session) return null;

  const initials = (session.name || session.email || 'U')
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{session.name}</Text>
        <Text style={styles.email}>{session.email}</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{PLAN_LABELS[session.subscription] ?? session.subscription} plan</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map(label => (
          <Pressable key={label} style={styles.menuItem}>
            <Text style={styles.menuLabel}>{label}</Text>
            <Text style={styles.chevron}>{'›'}</Text>
          </Pressable>
        ))}

        <Pressable style={styles.menuItem} onPress={signOut}>
          <Text style={[styles.menuLabel, styles.signOutLabel]}>Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  profileCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.magenta,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  email: {
    fontSize: 12,
    color: colors.inkMuted60,
    marginTop: 2,
  },
  planBadge: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.magenta,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.magenta,
  },
  menu: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkMuted10,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.ink,
  },
  chevron: {
    fontSize: 16,
    color: colors.inkMuted40,
  },
  signOutLabel: {
    color: colors.destructive,
    fontWeight: '600',
  },
});
