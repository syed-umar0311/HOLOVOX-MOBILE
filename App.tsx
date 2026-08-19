/**
 * HOLOVOX Android app root.
 * @format
 */
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme, type Theme as NavTheme } from '@react-navigation/native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { HoloAssistProvider } from '@/contexts/HoloAssistContext';
import { RootNavigator } from '@/app/RootNavigator';
import { GOOGLE_WEB_CLIENT_ID } from '@/config/env';

function Root() {
  const { colors, isDark } = useTheme();

  const navTheme: NavTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <NavigationContainer theme={navTheme}>
        <HoloAssistProvider>
          <RootNavigator />
        </HoloAssistProvider>
      </NavigationContainer>
    </>
  );
}

function App() {
  const scheme = useColorScheme();

  useEffect(() => {
    // Configuring here (rather than lazily before sign-in) surfaces a missing/invalid
    // GOOGLE_WEB_CLIENT_ID at startup instead of failing silently mid-flow.
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Root key={scheme} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
