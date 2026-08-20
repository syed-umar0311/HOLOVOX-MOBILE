/**
 * @format
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { colors } from './src/theme/colors';

function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
});

export default App;
