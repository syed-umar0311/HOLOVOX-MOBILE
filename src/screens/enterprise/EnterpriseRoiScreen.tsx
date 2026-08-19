import React, { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { enterpriseApi } from '@/api/enterpriseApi';
import { EmptyState } from '@/components/ui/EmptyState';

export function EnterpriseRoiScreen({ token, enterpriseId }: { token?: string; enterpriseId?: string }) {
  const { colors, radius: r } = useTheme();
  const [rounds, setRounds] = useState<number | null>(null);
  const [launching, setLaunching] = useState(false);

  const load = async () => {
    setRounds(await enterpriseApi.getConstructSessions(token, enterpriseId));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, enterpriseId]);

  const handleLaunch = async () => {
    setLaunching(true);
    try {
      setRounds(await enterpriseApi.launchConstructSession(token, enterpriseId));
    } finally {
      setLaunching(false);
    }
  };

  if (rounds === null) return <EmptyState title="Loading ROI & Construct…" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 20 }}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: r.xl }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>
          Construct sessions
        </Text>
        <Text style={{ color: colors.foreground, fontSize: 36, fontWeight: '800', marginTop: 6 }}>{rounds}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 4 }}>AI sparring rounds completed by the team</Text>
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title="Launch a Construct session" onPress={handleLaunch} loading={launching} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 20 },
});
