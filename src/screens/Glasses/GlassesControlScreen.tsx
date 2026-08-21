import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { useGlasses } from '../../context/GlassesContext';
import { ConnectionCard, DisplaySettingsCard, RemoteControlCard } from './components/DeviceCards';
import {
  AiAssistantCard,
  NavigationCard,
  NotificationsCard,
  OtaCard,
  TeleprompterCard,
  TranscriptionCard,
  TranslationCard,
} from './components/FeatureCards';
import { GlassesScanView } from './components/GlassesScanView';

export default function GlassesControlScreen() {
  const { connectionState, disableGlassesMode, supported } = useGlasses();
  const connected = connectionState === 'connected';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.canvas} />

      <View style={styles.header}>
        <Pressable style={styles.headerButton} onPress={disableGlassesMode} hitSlop={10}>
          <Icon name="chevronLeft" size={16} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>GLASSES CONTROL</Text>
        <View style={styles.headerButton} />
      </View>

      {!supported ? (
        <View style={styles.unsupported}>
          <Text style={styles.unsupportedTitle}>Android only</Text>
          <Text style={styles.unsupportedDescription}>
            AR99 glasses support is implemented via an Android native module and isn't available on this platform
            yet.
          </Text>
        </View>
      ) : connected ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ConnectionCard />
          <DisplaySettingsCard />
          <RemoteControlCard />
          <NotificationsCard />
          <AiAssistantCard />
          <TranslationCard />
          <TranscriptionCard />
          <TeleprompterCard />
          <NavigationCard />
          <OtaCard />
        </ScrollView>
      ) : (
        <GlassesScanView />
      )}
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
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    color: colors.ink,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    gap: 16,
  },
  unsupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  unsupportedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  unsupportedDescription: {
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
    lineHeight: 18,
  },
});
