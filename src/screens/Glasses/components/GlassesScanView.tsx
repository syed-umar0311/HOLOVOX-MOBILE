import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { colors } from '../../../theme/colors';
import { useGlasses } from '../../../context/GlassesContext';
import type { ScanResult } from '../../../native/GlassesModule';

export function GlassesScanView() {
  const {
    connectionState,
    devices,
    startScan,
    stopScan,
    connectTo,
    reconnect,
    lastError,
    clearError,
    wasUnexpectedDisconnect,
    lastDevice,
  } = useGlasses();
  const scanning = connectionState === 'scanning';
  const connecting = connectionState === 'connecting';

  if (connecting) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.magenta} size="large" />
        <Text style={styles.stateTitle}>Connecting…</Text>
        <Text style={styles.stateDescription}>Pairing with your AR99 glasses over Bluetooth.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Find your AR99 glasses</Text>
        <Text style={styles.introDescription}>
          We use Bluetooth to discover nearby AR99 smart glasses and connect to them. Turn your glasses on and keep
          them close by.
        </Text>
      </View>

      {lastError ? (
        <Pressable style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{lastError}</Text>
          <Text style={styles.errorDismiss}>Dismiss</Text>
        </Pressable>
      ) : null}

      {wasUnexpectedDisconnect && lastDevice ? (
        <PrimaryButton label={`Reconnect to ${lastDevice.projName || lastDevice.name || 'glasses'}`} onPress={reconnect} />
      ) : null}

      <PrimaryButton
        label={scanning ? 'Scanning…' : devices.length > 0 ? 'Scan again' : 'Scan for glasses'}
        onPress={() => (scanning ? stopScan() : startScan())}
      />

      <View style={styles.listWrap}>
        {scanning && devices.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator color={colors.magenta} />
            <Text style={styles.emptyStateText}>Searching for AR99 devices…</Text>
          </View>
        ) : devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No devices found yet. Make sure your glasses are powered on.</Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }: { item: ScanResult }) => (
              <Pressable style={styles.deviceRow} onPress={() => connectTo(item)}>
                <View style={styles.deviceIcon} />
                <View style={styles.deviceTextWrap}>
                  <Text style={styles.deviceName}>{item.projName || item.name || 'AR99 Glasses'}</Text>
                  <Text style={styles.deviceSub}>
                    {item.projSN ? `SN: ${item.projSN}` : item.id} · {item.rssi} dBm
                  </Text>
                </View>
                <Text style={styles.connectArrow}>{'→'}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 32,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: 8,
  },
  stateDescription: {
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
  },
  intro: {
    gap: 6,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  introDescription: {
    fontSize: 12,
    color: colors.inkMuted60,
    lineHeight: 18,
  },
  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.destructive,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.destructive,
  },
  errorDismiss: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.destructive,
  },
  listWrap: {
    flex: 1,
  },
  list: {
    gap: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.card,
    padding: 14,
    gap: 12,
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
  },
  deviceTextWrap: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  deviceSub: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  connectArrow: {
    fontSize: 14,
    color: colors.magenta,
    fontWeight: '700',
  },
});
