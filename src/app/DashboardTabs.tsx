import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { DashboardTabParamList } from './types';
import { HomeScreen } from '@/screens/dashboard/HomeScreen';
import { MeetingsScreen } from '@/screens/dashboard/MeetingsScreen';
import { CalendarScreen } from '@/screens/dashboard/CalendarScreen';
import { ChatScreen } from '@/screens/dashboard/ChatScreen';
import { MoreScreen } from '@/screens/dashboard/MoreScreen';
import { useTheme } from '@/theme/ThemeProvider';

const Tab = createBottomTabNavigator<DashboardTabParamList>();

// Web's sidebar has ~11 nav items across 3 groups — a phone tab bar tops out around 5
// before it stops being usable, so the top-level items (per navGroups/mobileTabs in
// web's Dashboard.tsx) get the tab bar, and everything else moves under "More".
export function DashboardTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
      }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meetings" component={MeetingsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}
