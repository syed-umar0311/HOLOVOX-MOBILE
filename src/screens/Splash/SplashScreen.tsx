import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { InfinityLogo } from '../../components/InfinityLogo';
import { colors } from '../../theme/colors';

const SPLASH_DURATION_MS = 3000;

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />
      <InfinityLogo size={96} color="magenta" voidColor="ink" />
      <Text style={styles.wordmark}>HOLOVOX</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    marginTop: 24,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: colors.ink,
  },
});
