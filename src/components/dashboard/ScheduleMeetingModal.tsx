import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import type { CalendarMeeting } from '../../types/calendar';

export interface ScheduleMeetingPayload {
  title: string;
  date: Date;
  time: string;
  agenda: string;
  participants: string[];
}

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(meeting?: CalendarMeeting | null): string {
  if (!meeting) return '10:00';
  return `${String(meeting.hour).padStart(2, '0')}:${String(meeting.minute).padStart(2, '0')}`;
}

export function ScheduleMeetingModal({
  visible,
  meeting,
  defaultDate,
  isSaving,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  meeting: CalendarMeeting | null;
  defaultDate: Date;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (payload: ScheduleMeetingPayload) => void;
}) {
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [agenda, setAgenda] = useState(meeting?.agenda ?? '');
  const [dateText, setDateText] = useState(toDateInput(meeting?.date ?? defaultDate));
  const [time, setTime] = useState(toTimeInput(meeting));
  const [participants, setParticipants] = useState<string[]>(meeting?.participants ?? []);
  const [currentInput, setCurrentInput] = useState('');

  const addParticipant = () => {
    const val = currentInput.trim().replace(/,/g, '');
    if (val && !participants.includes(val)) {
      setParticipants(prev => [...prev, val]);
    }
    setCurrentInput('');
  };

  const removeParticipant = (index: number) => {
    setParticipants(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeInput = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      const last = parts.pop() ?? '';
      const additions = parts.map(p => p.trim()).filter(p => p && !participants.includes(p));
      if (additions.length) setParticipants(prev => [...prev, ...additions]);
      setCurrentInput(last);
    } else {
      setCurrentInput(text);
    }
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    const finalParticipants = [...participants];
    const extra = currentInput.trim().replace(/,/g, '');
    if (extra && !finalParticipants.includes(extra)) finalParticipants.push(extra);

    const parsedDate = new Date(dateText);
    const date = Number.isNaN(parsedDate.getTime()) ? defaultDate : parsedDate;

    onSubmit({ title: title.trim(), date, time, agenda, participants: finalParticipants });
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
            <Icon name="close" size={13} color={colors.inkMuted60} />
          </Pressable>

          <Text style={styles.eyebrow}>{meeting ? 'Edit event' : 'New event'}</Text>
          <Text style={styles.title}>{meeting ? 'Update meeting' : 'Schedule a meeting'}</Text>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Sales pitch — Acme"
                placeholderTextColor={colors.mutedForeground}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Agenda / Notes</Text>
              <TextInput
                value={agenda}
                onChangeText={setAgenda}
                placeholder="What will be discussed?"
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textarea]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Participants / Guests</Text>
              <View style={styles.tagBox}>
                {participants.map((email, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{email}</Text>
                    <Pressable onPress={() => removeParticipant(idx)} hitSlop={6}>
                      <Icon name="close" size={9} color={colors.magenta} />
                    </Pressable>
                  </View>
                ))}
                <TextInput
                  value={currentInput}
                  onChangeText={handleChangeInput}
                  onSubmitEditing={addParticipant}
                  onBlur={addParticipant}
                  placeholder={participants.length === 0 ? 'Type email, then comma or Enter…' : 'Add more…'}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.tagInput}
                />
              </View>
              <Text style={styles.hint}>Separate emails with a comma</Text>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  value={dateText}
                  onChangeText={setDateText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.input}
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.mutedForeground}
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable style={[styles.submit, isSaving && styles.submitDisabled]} onPress={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color={colors.card} size="small" />
              ) : (
                <Text style={styles.submitLabel}>{meeting ? 'Update meeting' : 'Add to calendar'}</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 27, 27, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 26,
    backgroundColor: colors.canvas,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.inkMuted40,
  },
  title: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  form: {
    marginTop: 18,
  },
  formContent: {
    gap: 14,
    paddingBottom: 4,
  },
  field: {
    gap: 6,
  },
  flex1: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  tagBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inkMuted15,
    backgroundColor: colors.card,
    padding: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.magenta,
  },
  tagInput: {
    flex: 1,
    minWidth: 120,
    fontSize: 13,
    color: colors.ink,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  hint: {
    fontSize: 10,
    color: colors.inkMuted40,
  },
  submit: {
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    backgroundColor: colors.inkMuted40,
  },
  submitLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.card,
  },
});
