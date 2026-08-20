import React, { useState } from 'react';
import SplashScreen from '../screens/Splash/SplashScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import OtpScreen from '../screens/Auth/OtpScreen';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import { useAuth } from '../context/AuthContext';

type AuthScreen = 'signin' | 'signup' | 'otp';

export function AppNavigator() {
  const { session } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('signin');

  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  if (session) {
    return <DashboardScreen />;
  }

  switch (authScreen) {
    case 'signup':
      return (
        <SignUpScreen
          onSwitchToSignIn={() => setAuthScreen('signin')}
          onOtpSent={() => setAuthScreen('otp')}
        />
      );
    case 'otp':
      return <OtpScreen onBack={() => setAuthScreen('signup')} />;
    case 'signin':
    default:
      return <SignInScreen onSwitchToSignUp={() => setAuthScreen('signup')} />;
  }
}
