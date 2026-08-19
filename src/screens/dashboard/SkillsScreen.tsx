import React, { useState } from 'react';
import { ScrollView, Switch, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

type Skill = { id: string; emoji: string; name: string; desc: string; enabled: boolean; pro?: boolean };

// Local-only toggle list on web too (no backend persistence) — ported 1:1.
const SEED: Skill[] = [
  { id: 'summary', emoji: '📝', name: 'General summary', desc: 'Concise summary with bullet highlights after every call.', enabled: true },
  { id: 'tasks', emoji: '✅', name: 'Action item extraction', desc: 'Detects tasks, owners and due dates automatically.', enabled: true },
  { id: 'sales', emoji: '💼', name: 'Sales call coach', desc: 'BANT, objections, next steps & buyer sentiment.', enabled: false, pro: true },
  { id: 'translate', emoji: '🌐', name: 'Live translation', desc: 'Real-time captions in real time translation.', enabled: false, pro: true },
  { id: 'soundbites', emoji: '🎧', name: 'Auto soundbites', desc: 'Picks the most quotable moments to share.', enabled: false },
  { id: 'followup', emoji: '✉️', name: 'Follow-up email', desc: 'Drafts a personalized recap email per attendee.', enabled: false, pro: true },
];

export function SkillsScreen() {
  const { colors, radius: r } = useTheme();
  const [skills, setSkills] = useState<Skill[]>(SEED);
  const toggle = (id: string) => setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Text style={[styles.title, { color: colors.foreground }]}>AI Skills</Text>
      <Text style={{ color: colors.mutedForeground, marginBottom: 20 }}>Plug-and-play AI workflows that run on every call.</Text>

      {skills.map((s) => (
        <View key={s.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: r.xl }]}>
          <View style={styles.cardHeader}>
            <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{s.name}</Text>
              {s.pro ? <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 }}>ENTERPRISE</Text> : null}
            </View>
            <Switch
              value={s.enabled}
              onValueChange={() => toggle(s.id)}
              disabled={s.pro && !s.enabled}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>
          <Text style={[styles.desc, { color: colors.mutedForeground }]}>{s.desc}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: '800' },
  card: { borderWidth: 1, padding: 16, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 15, fontWeight: '600' },
  desc: { fontSize: 12, marginTop: 8 },
});
