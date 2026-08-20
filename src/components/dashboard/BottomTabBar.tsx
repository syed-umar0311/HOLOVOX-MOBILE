import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
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
          <Pressable key={tab.id} style={styles.tab} onPress={() => onChange(tab.id)}>
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Text style={styles.icon}>{tab.icon}</Text>
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
    paddingTop: 6,
    paddingBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
  },
  icon: {
    fontSize: 17,
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
