import React, { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { RadarChart } from './RadarChart';
import { parentOf } from '@/lib/orgTreeLayout';
import type { NodePerformanceData } from '@/lib/orgPerformance';
import type { OrgNode } from '@/types/enterprise';

interface Props {
  node: OrgNode | null;
  onClose: () => void;
  orgNodes: OrgNode[];
  orgEdges: [string, string][];
  canEdit: boolean;
  performance?: NodePerformanceData;
  onReassign?: (repId: string, managerId: string | null) => Promise<void>;
  onDelete?: (node: OrgNode) => Promise<void>;
  onKnock?: (node: OrgNode) => Promise<void>;
}

// Ported from src/Pages/enterprise/components/EnterpriseNodeDrawer.tsx's core actions
// (manager reassignment, delete, knock, "Me vs. Me" radar) as a bottom-sheet modal — web's
// side drawer doesn't fit a phone screen. Manager reassignment uses a tap-to-select list
// instead of a native <select>, same underlying action (onReassignManager).
export function NodeDrawer({ node, onClose, orgNodes, orgEdges, canEdit, performance, onReassign, onDelete, onKnock }: Props) {
  const { colors, radius: r } = useTheme();
  const [busy, setBusy] = useState(false);
  const [pickingManager, setPickingManager] = useState(false);

  if (!node) return null;

  const currentManagerId = parentOf(node.id, orgEdges);
  const managers = orgNodes.filter((n) => n.tier === 'mgr' && n.id !== node.id);
  const canReassign = canEdit && node.tier === 'rep' && Boolean(onReassign);

  const handleReassign = async (managerId: string | null) => {
    if (!onReassign) return;
    setBusy(true);
    try {
      await onReassign(node.id, managerId);
      setPickingManager(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reassign');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert('Remove from organization', `Remove ${node.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onDelete(node);
            onClose();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleKnock = async () => {
    if (!onKnock) return;
    setBusy(true);
    try {
      await onKnock(node);
      Alert.alert('Knock sent', `${node.name} will be notified.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send knock');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={!!node} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderTopLeftRadius: r['2xl'], borderTopRightRadius: r['2xl'] }]}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: node.color }]}>
              <Text style={styles.avatarText}>{node.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.foreground }]}>{node.name}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{node.role}{node.email ? ` · ${node.email}` : ''}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView>
            {performance ? (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <RadarChart axes={performance.axes} now={performance.now} prev={performance.prev} size={260} />
              </View>
            ) : null}

            {canReassign ? (
              <View style={{ marginTop: 8 }}>
                {!pickingManager ? (
                  <Button title="Reassign manager" variant="outline" onPress={() => setPickingManager(true)} />
                ) : (
                  <View style={[styles.pickerBox, { borderColor: colors.border, borderRadius: r.lg }]}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 6 }}>Select a manager</Text>
                    {managers.map((mgr) => (
                      <Pressable
                        key={mgr.id}
                        disabled={busy}
                        onPress={() => handleReassign(mgr.id)}
                        style={[styles.pickerRow, { backgroundColor: currentManagerId === mgr.id ? colors.primary + '15' : 'transparent' }]}>
                        <Text style={{ color: colors.foreground, fontSize: 13 }}>{mgr.name}</Text>
                      </Pressable>
                    ))}
                    <Pressable disabled={busy} onPress={() => setPickingManager(false)} style={styles.pickerRow}>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Cancel</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.actions}>
              {onKnock ? <Button title="Knock the door" onPress={handleKnock} loading={busy} /> : null}
              {onDelete && node.tier !== 'owner' ? <Button title="Remove from organization" variant="outline" onPress={handleDelete} /> : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '80%', minHeight: 320, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  name: { fontSize: 16, fontWeight: '700' },
  pickerBox: { borderWidth: 1, padding: 8 },
  pickerRow: { paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  actions: { marginTop: 16, gap: 10 },
});
