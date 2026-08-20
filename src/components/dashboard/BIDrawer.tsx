import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BusinessIntelligenceItem } from '../../data/businessIntelligence';
import { InfinityLogo } from '../InfinityLogo';
import { colors } from '../../theme/colors';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

export function BIDrawer({
  visible,
  items,
  onClose,
}: {
  visible: boolean;
  items: BusinessIntelligenceItem[];
  onClose: () => void;
}) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, backdropOpacity]);

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.drawer, { width: DRAWER_WIDTH, transform: [{ translateX }] }]}>
        <View style={styles.header}>
          <InfinityLogo size={28} color="magenta" voidColor="ink" animated={false} />
          <Text style={styles.title}>Business Intelligence</Text>
        </View>
        <Text style={styles.subtitle}>Available on your current plan</Text>

        <View style={styles.list}>
          {items.length === 0 ? (
            <Text style={styles.empty}>No Business Intelligence tools on your plan yet.</Text>
          ) : (
            items.map(item => (
              <Pressable key={item.id} style={styles.item}>
                <Text style={styles.itemLabel}>{item.label}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </Pressable>
            ))
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 27, 27, 0.4)',
  },
  drawer: {
    height: '100%',
    backgroundColor: colors.card,
    paddingTop: 56,
    paddingHorizontal: 20,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 11,
    color: colors.inkMuted60,
    marginTop: 6,
    marginBottom: 20,
  },
  list: {
    gap: 10,
  },
  item: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    padding: 14,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 11,
    color: colors.inkMuted60,
    lineHeight: 16,
  },
  empty: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
});
