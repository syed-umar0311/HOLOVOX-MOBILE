import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui/Button';
import type { Poll } from '@/types/callData';

interface Props {
  visible: boolean;
  onClose: () => void;
  isLocalHost: boolean;
  activePoll: Poll | null;
  mySelections: string[];
  hasVoted: boolean;
  onCreate: (question: string, options: string[], multiSelect: boolean) => void;
  onToggleSelection: (optionId: string, multiSelect: boolean) => void;
  onCastVote: () => void;
  onClosePoll: () => void;
}

export function PollPanel({
  visible,
  onClose,
  isLocalHost,
  activePoll,
  mySelections,
  hasVoted,
  onCreate,
  onToggleSelection,
  onCastVote,
  onClosePoll,
}: Props) {
  const { colors, radius: r } = useTheme();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiSelect, setMultiSelect] = useState(false);

  const totalVotes = activePoll ? Object.keys(activePoll.votes).length : 0;
  const countFor = (optionId: string) =>
    activePoll ? Object.values(activePoll.votes).filter((sel) => sel.includes(optionId)).length : 0;

  const handleCreate = () => {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) return;
    onCreate(question.trim(), cleanOptions, multiSelect);
    setQuestion('');
    setOptions(['', '']);
    setMultiSelect(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderTopLeftRadius: r['2xl'], borderTopRightRadius: r['2xl'] }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Poll</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView>
            {activePoll ? (
              <>
                <Text style={[styles.question, { color: colors.foreground }]}>{activePoll.question}</Text>
                {activePoll.options.map((opt) => {
                  const votes = countFor(opt.id);
                  const pct = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
                  const selected = mySelections.includes(opt.id);
                  const showResults = isLocalHost || hasVoted;
                  return (
                    <Pressable
                      key={opt.id}
                      disabled={isLocalHost || hasVoted}
                      onPress={() => onToggleSelection(opt.id, activePoll.multiSelect)}
                      style={[
                        styles.option,
                        { borderColor: selected ? colors.primary : colors.border, borderRadius: r.lg, backgroundColor: colors.card },
                      ]}>
                      {showResults ? (
                        <View style={[styles.resultFill, { width: `${pct}%`, backgroundColor: colors.primary + '22', borderRadius: r.lg }]} />
                      ) : null}
                      <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: '500' }}>{opt.text}</Text>
                      {showResults ? <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>{votes} · {pct}%</Text> : null}
                    </Pressable>
                  );
                })}

                {isLocalHost ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11, marginBottom: 8 }}>{totalVotes} votes so far</Text>
                    <Button title="End poll" variant="outline" onPress={onClosePoll} />
                  </View>
                ) : !hasVoted ? (
                  <View style={{ marginTop: 12 }}>
                    <Button title="Submit vote" onPress={onCastVote} disabled={mySelections.length === 0} />
                  </View>
                ) : (
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 12 }}>You voted.</Text>
                )}
              </>
            ) : isLocalHost ? (
              <>
                <TextInput
                  value={question}
                  onChangeText={setQuestion}
                  placeholder="Ask a question…"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: r.lg }]}
                />
                {options.map((opt, i) => (
                  <TextInput
                    key={i}
                    value={opt}
                    onChangeText={(v) => setOptions((prev) => prev.map((o, idx) => (idx === i ? v : o)))}
                    placeholder={`Option ${i + 1}`}
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card, borderRadius: r.lg }]}
                  />
                ))}
                <Pressable onPress={() => setOptions((prev) => [...prev, ''])}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600', marginBottom: 12 }}>+ Add option</Text>
                </Pressable>
                <View style={styles.multiRow}>
                  <Text style={{ color: colors.foreground, fontSize: 13 }}>Allow multiple answers</Text>
                  <Switch value={multiSelect} onValueChange={setMultiSelect} trackColor={{ true: colors.primary, false: colors.border }} />
                </View>
                <Button title="Share poll" onPress={handleCreate} />
              </>
            ) : (
              <Text style={{ color: colors.mutedForeground, textAlign: 'center', paddingVertical: 30 }}>
                No active poll. Only the host can start one.
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '75%', minHeight: 320, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  question: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  option: { padding: 12, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  resultFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  input: { borderWidth: 1, padding: 12, fontSize: 13, marginBottom: 8 },
  multiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
});
