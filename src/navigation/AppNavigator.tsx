import React, { useState } from 'react';
import SplashScreen from '../screens/Splash/SplashScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';

type Screen = 'splash' | 'signin' | 'signup';

export function AppNavigator() {
  const [screen, setScreen] = useState<Screen>('splash');

  switch (screen) {
    case 'splash':
      return <SplashScreen onFinish={() => setScreen('signin')} />;
    case 'signup':
      return <SignUpScreen onSwitchToSignIn={() => setScreen('signin')} />;
    case 'signin':
    default:
      return <SignInScreen onSwitchToSignUp={() => setScreen('signup')} />;
  }
}
