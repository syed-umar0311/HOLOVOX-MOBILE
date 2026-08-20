import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import { flattenAndSortTranscripts, type TranscriptData } from '../../types/meetings';

export function TranscriptPanel({
  transcripts,
  isLoading,
  error,
}: {
  transcripts: TranscriptData | null;
  isLoading: boolean;
  error: string | null;
}) {
  const [search, setSearch] = useState('');

  const allLines = useMemo(() => flattenAndSortTranscripts(transcripts), [transcripts]);
  const filteredLines = useMemo(() => {
    if (!search.trim()) return allLines;
    const term = search.toLowerCase();
    return allLines.filter(l => l.who.toLowerCase().includes(term) || l.text.toLowerCase().includes(term));
  }, [allLines, search]);

  if (isLoading) {
    return <ActivityIndicator color={colors.magenta} style={styles.loader} />;
  }

  if (error) {
    return (
      <View style={styles.centerMessage}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.subtleText}>No transcript available for this meeting</Text>
      </View>
    );
  }

  if (!transcripts || transcripts.participants.length === 0) {
    return (
      <View style={styles.centerMessage}>
        <Text style={styles.subtleTitle}>No transcripts found for this meeting</Text>
        <Text style={styles.subtleText}>Transcripts will appear once the meeting is recorded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" size={14} color={colors.inkMuted40} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search transcript…"
          placeholderTextColor={colors.mutedForeground}
          style={styles.searchInput}
        />
      </View>

      {filteredLines.length === 0 ? (
        <View style={styles.centerMessage}>
          <Text style={styles.subtleText}>No transcripts match &quot;{search}&quot;</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredLines.map((line, i) => (
            <View key={i} style={styles.line}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{line.who.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.lineBody}>
                <Text style={styles.lineMeta}>
                  {line.who} · {line.time}
                </Text>
                <Text style={styles.lineText}>{line.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>{transcripts.participants.length} participants</Text>
        <Text style={styles.footerText}>{filteredLines.length} messages</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 32,
  },
  centerMessage: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.destructive,
  },
  subtleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  subtleText: {
    fontSize: 12,
    color: colors.inkMuted40,
    textAlign: 'center',
  },
  container: {
    gap: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.inkMuted10,
    backgroundColor: colors.canvas,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.ink,
    padding: 0,
  },
  list: {
    gap: 0,
  },
  line: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.magenta,
  },
  lineBody: {
    flex: 1,
    gap: 3,
  },
  lineMeta: {
    fontSize: 11,
    color: colors.inkMuted40,
  },
  lineText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.inkMuted10,
    paddingTop: 12,
  },
  footerText: {
    fontSize: 11,
    color: colors.inkMuted60,
  },
});
