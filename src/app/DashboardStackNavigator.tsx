import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DashboardStackParamList } from './types';
import { DashboardTabs } from './DashboardTabs';
import { RecordingsScreen } from '@/screens/dashboard/RecordingsScreen';
import { TasksScreen } from '@/screens/dashboard/TasksScreen';
import { SkillsScreen } from '@/screens/dashboard/SkillsScreen';
import { AnalyticsScreen } from '@/screens/dashboard/AnalyticsScreen';
import { SettingsScreen } from '@/screens/dashboard/SettingsScreen';
import { ProfileScreen } from '@/screens/dashboard/ProfileScreen';
import { ChatConversationScreen } from '@/screens/dashboard/ChatConversationScreen';
import { EnterpriseScreen } from '@/screens/enterprise/EnterpriseScreen';
import { HoloAssistScreen } from '@/screens/holoAssist/HoloAssistScreen';
import { KnockListener } from '@/components/KnockListener';
import { HoloAssistBubble } from '@/components/HoloAssistBubble';
import { useTheme } from '@/theme/ThemeProvider';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export function DashboardStackNavigator() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: colors.foreground,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="MainTabs" component={DashboardTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Recordings" component={RecordingsScreen} options={{ title: 'Holo Capture' }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
        <Stack.Screen name="Skills" component={SkillsScreen} options={{ title: 'AI Skills' }} />
        <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'InsightHub' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} options={{ title: '' }} />
        <Stack.Screen name="Enterprise" component={EnterpriseScreen} options={{ title: 'Enterprise' }} />
        <Stack.Screen name="HoloAssist" component={HoloAssistScreen} options={{ title: 'Holo-Assist' }} />
      </Stack.Navigator>
      {/* Mirrors web mounting <KnockPopup /> once at the DashboardLayout level so it
          surfaces on its own regardless of which dashboard screen is active. */}
      <KnockListener />
      <HoloAssistBubble />
    </View>
  );
}
