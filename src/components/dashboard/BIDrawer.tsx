import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BusinessIntelligenceItem } from '../../data/businessIntelligence';
import { InfinityLogo } from '../InfinityLogo';
import { Icon } from '../Icon';
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
          <View style={styles.headerLeft}>
            <InfinityLogo size={26} color="magenta" voidColor="ink" animated={false} />
            <Text style={styles.title}>Business{'\n'}Intelligence</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Icon name="close" size={14} color={colors.inkMuted60} />
          </Pressable>
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
    paddingTop: 60,
    paddingHorizontal: 22,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: colors.ink,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.inkMuted10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    lineHeight: 18,
    color: colors.ink,
    flexShrink: 1,
  },
  subtitle: {
    fontSize: 12,
    color: colors.inkMuted60,
    marginTop: 16,
    marginBottom: 22,
  },
  list: {
    gap: 12,
  },
  item: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.canvas,
    padding: 16,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 5,
  },
  itemDescription: {
    fontSize: 12,
    color: colors.inkMuted60,
    lineHeight: 17,
  },
  empty: {
    fontSize: 12,
    color: colors.inkMuted60,
  },
});
