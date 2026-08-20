import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../Icon';
import { colors } from '../../theme/colors';

export interface TabItem {
  id: string;
  label: string;
  icon: IconName;
}

export function BottomTabBar({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.bar}>
      {tabs.map(tab => {
        const active = tab.id === activeTab;
        return (
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)} hitSlop={6}>
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Icon name={tab.icon} size={18} color={active ? colors.magenta : colors.inkMuted60} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.inkMuted10,
    backgroundColor: colors.canvas,
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.inkMuted60,
  },
  labelActive: {
    fontWeight: '700',
    color: colors.ink,
  },
});
