import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import { AuthNavigator } from './AuthNavigator';
import { DashboardStackNavigator } from './DashboardStackNavigator';
import { CallRoomScreen } from '@/screens/call/CallRoomScreen';
import { useSession } from '@/hooks/useSession';
import { useTheme } from '@/theme/ThemeProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Chooses the initial route based on stored session, mirroring the web app's
 * ProtectedRoute/getPostLoginRoute redirect logic but at the navigator level instead of
 * per-route guards, since RN navigation state resets are the natural way to swap stacks. */
export function RootNavigator() {
  const { colors } = useTheme();
  const { session, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={session ? 'Dashboard' : 'Auth'}>
      <Stack.Screen name="Auth" component={AuthNavigator} />
      <Stack.Screen name="Dashboard" component={DashboardStackNavigator} />
      <Stack.Screen name="Call" component={CallRoomScreen} options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
