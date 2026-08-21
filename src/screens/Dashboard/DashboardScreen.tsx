import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { BottomTabBar, type TabItem } from '../../components/dashboard/BottomTabBar';
import { BIDrawer } from '../../components/dashboard/BIDrawer';
import { Icon } from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useGlasses } from '../../context/GlassesContext';
import { getBusinessIntelligenceItems } from '../../data/businessIntelligence';
import { colors } from '../../theme/colors';
import GlassesControlScreen from '../Glasses/GlassesControlScreen';
import AccountScreen from './AccountScreen';
import HomeScreen from './HomeScreen';
import MeetingsScreen from './MeetingsScreen';
import CalendarScreen from './CalendarScreen';
import ChatScreen from './ChatScreen';

const WORKSPACE_TABS: TabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'meetings', label: 'Meetings', icon: 'meetings' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'chats', label: 'Chats', icon: 'chats' },
  { id: 'account', label: 'Account', icon: 'account' },
];

export default function DashboardScreen() {
  const { session } = useAuth();
  const { glassesMode } = useGlasses();
  const [activeTab, setActiveTab] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const biItems = useMemo(
    () => getBusinessIntelligenceItems(session?.subscription ?? 'free', session?.subscriptionStatus),
    [session?.subscription, session?.subscriptionStatus],
  );

  if (!session) return null;

  if (glassesMode) {
    return <GlassesControlScreen />;
  }

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
          <ChatScreen />
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
