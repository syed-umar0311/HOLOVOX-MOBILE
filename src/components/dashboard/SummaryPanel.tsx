import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../Icon';
import { colors } from '../../theme/colors';
import type { SummaryCard, TranscriptData } from '../../types/meetings';

const AI_ASSISTANT_API = 'https://holovoxserver-production-eb5d.up.railway.app/api/ai-assistant';

export function SummaryPanel({
  meetingId,
  userId,
  transcripts,
  isFree,
  onUpgrade,
}: {
  meetingId: string | null;
  userId: string;
  transcripts: TranscriptData | null;
  isFree: boolean;
  onUpgrade?: () => void;
}) {
  const [cards, setCards] = useState<SummaryCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchSummaries = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${AI_ASSISTANT_API}/get-summaries?meetingId=${id}`);
      const data = await res.json();
      if (data.success) {
        setCards((data.data || []).map((s: any) => ({ id: s.id, text: s.summary, timestamp: s.createdAt })));
      }
    } catch (err) {
      console.error('Error fetching summaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setCards([]);
    if (meetingId) fetchSummaries(meetingId);
  }, [meetingId, fetchSummaries]);

  const hasTranscripts = Boolean(transcripts?.participants?.length);

  const handleGenerate = async () => {
    if (!meetingId || !transcripts?.participants?.length) return;
    const formatted: { participantName: string; text: string }[] = [];
    transcripts.participants.forEach(p => {
      p.texts.forEach(text => {
        if (text && text !== '[NO SPEECH DETECTED]') formatted.push({ participantName: p.name, text });
      });
    });
    if (formatted.length === 0) return;

    setGenerating(true);
    try {
      const res = await fetch(`${AI_ASSISTANT_API}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, userId, transcripts: formatted, meetingTitle: 'Meeting Summary' }),
      });
      const data = await res.json();
      if (data.success) await fetchSummaries(meetingId);
    } catch (err) {
      console.error('Error generating summary:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (isFree) {
    return (
      <View style={styles.lockCard}>
        <View style={styles.lockIconWrap}>
          <Icon name="lock" size={22} color={colors.magenta} />
        </View>
        <Text style={styles.lockTitle}>
          You&apos;re on the <Text style={styles.lockTitleAccent}>Free plan</Text>
        </Text>
        <Text style={styles.lockBody}>Unlock AI summaries, sentiment analysis, and topic tracking.</Text>
        <Pressable style={styles.upgradeButton} onPress={onUpgrade}>
          <Text style={styles.upgradeButtonText}>Upgrade to Spark</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return <ActivityIndicator color={colors.magenta} style={styles.loader} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Summary</Text>
        {cards.length === 0 ? (
          <Pressable
            style={[styles.generateButton, (generating || !hasTranscripts) && styles.generateButtonDisabled]}
            onPress={handleGenerate}
            disabled={generating || !hasTranscripts}
          >
            <Text style={styles.generateButtonText}>{generating ? 'Generating…' : 'Generate summary'}</Text>
          </Pressable>
        ) : (
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>Ready</Text>
          </View>
        )}
      </View>

      {cards.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No summaries generated yet</Text>
          <Text style={styles.emptyBody}>
            {hasTranscripts ? 'Tap "Generate summary" to create one.' : 'No transcripts available for this meeting yet.'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {cards
            .slice()
            .reverse()
            .map(card => (
              <View key={card.id} style={styles.card}>
                <Text style={styles.cardTimestamp}>{new Date(card.timestamp).toLocaleString()}</Text>
                <Text style={styles.cardText}>{card.text}</Text>
              </View>
            ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: {
    paddingVertical: 32,
  },
  lockCard: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.2)',
    backgroundColor: 'rgba(225, 29, 72, 0.05)',
    padding: 24,
  },
  lockIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(225, 29, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lockTitle: {
    fontSize: 14,
    color: colors.ink,
  },
  lockTitleAccent: {
    fontWeight: '700',
    color: colors.magenta,
  },
  lockBody: {
    marginTop: 6,
    fontSize: 12,
    color: colors.inkMuted60,
    textAlign: 'center',
  },
  upgradeButton: {
    marginTop: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(225, 29, 72, 0.3)',
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  upgradeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.magenta,
  },
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: colors.ink,
  },
  generateButton: {
    borderRadius: 999,
    backgroundColor: colors.magenta,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  generateButtonDisabled: {
    backgroundColor: colors.inkMuted15,
  },
  generateButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.card,
  },
  readyBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.inkMuted60,
  },
  emptyBody: {
    fontSize: 12,
    color: colors.inkMuted40,
    textAlign: 'center',
  },
  list: {
    maxHeight: 420,
  },
  card: {
    borderRadius: 14,
    backgroundColor: colors.canvas,
    padding: 14,
    marginBottom: 10,
  },
  cardTimestamp: {
    fontSize: 10,
    color: colors.inkMuted40,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
  },
});
