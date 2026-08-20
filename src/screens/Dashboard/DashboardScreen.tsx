import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { BottomTabBar, type TabItem } from '../../components/dashboard/BottomTabBar';
import { BIDrawer } from '../../components/dashboard/BIDrawer';
import { PlaceholderScreen } from '../../components/dashboard/PlaceholderScreen';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { getBusinessIntelligenceItems } from '../../data/businessIntelligence';
import { colors } from '../../theme/colors';
import AccountScreen from './AccountScreen';
import HomeScreen from './HomeScreen';
import MeetingsScreen from './MeetingsScreen';
import CalendarScreen from './CalendarScreen';

const WORKSPACE_TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'meetings', label: 'Meetings', icon: 'meetings' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'chats', label: 'Chats', icon: 'chats' },
  { id: 'account', label: 'Account', icon: 'account' },
];

const SCREEN_COPY: Record<string, { title: string; description: string }> = {
  chats: { title: 'Chats', description: 'Conversations with your team will appear here.' },
};

export default function DashboardScreen() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const biItems = useMemo(
    () => getBusinessIntelligenceItems(session?.subscription ?? 'free', session?.subscriptionStatus),
    [session?.subscription, session?.subscriptionStatus],
  );

  if (!session) return null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <Pressable style={styles.menuButton} onPress={() => setDrawerOpen(true)} hitSlop={10}>
          <Icon name="menu" size={18} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>HOLOVOX</Text>
        <View style={styles.menuButton} />
      </View>

      <View style={styles.content}>
        {activeTab === 'account' ? (
          <AccountScreen />
        ) : activeTab === 'home' ? (
          <HomeScreen />
        ) : activeTab === 'meetings' ? (
          <MeetingsScreen />
        ) : activeTab === 'calendar' ? (
          <CalendarScreen />
        ) : (
          <PlaceholderScreen {...SCREEN_COPY[activeTab]} />
        )}
      </View>

      <BottomTabBar tabs={WORKSPACE_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <BIDrawer visible={drawerOpen} items={biItems} onClose={() => setDrawerOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.inkMuted10,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.ink,
  },
  content: {
    flex: 1,
  },
});
