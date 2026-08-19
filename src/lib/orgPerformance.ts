import type { OrgNode } from '@/types/enterprise';
import type { EnterpriseFlagRecord, EnterpriseMeetingRecord, EnterpriseTranscriptRecord } from '@/types/enterprise';

// Ported unchanged from src/Pages/enterprise/utils/orgPerformance.ts — pure scoring
// logic with no DOM dependency, shared by the owner/manager Performance tabs so the
// same person's "Me vs. Me" radar always shows identical numbers regardless of viewer.

export type TierKey = 'rep' | 'mgr' | 'owner';

export const PERFORMANCE_AXES: Record<TierKey, string[]> = {
  rep: ['Session Volume', 'Discovery Depth', 'Objection Control', 'Repair Rate', 'Message Discipline', 'Follow-Through'],
  mgr: ['Team Coverage', 'Rep Development', 'Risk Control', 'Resolution Rate', 'Message Discipline', 'Follow-Through'],
  owner: ['Org Coverage', 'Team Depth', 'Risk Control', 'Resolution Rate', 'Message Discipline', 'Brain Adoption'],
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const daysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;
const inWindow = (dateValue: string | undefined, start: number, end: number) => {
  const time = dateValue ? new Date(dateValue).getTime() : 0;
  return time >= start && time < end;
};
const getId = (value: unknown) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && '_id' in value && typeof (value as { _id: unknown })._id === 'string') {
    return (value as { _id: string })._id;
  }
  return '';
};
const severityWeight = (severity?: string) => (severity === 'high' ? 3 : severity === 'medium' ? 2 : 1);
const memberFromTranscript = (transcript: EnterpriseTranscriptRecord) =>
  transcript.speakerMemberId || transcript.participantMemberId || '';
const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export interface NodePerformanceData {
  axes: string[];
  now: number[];
  prev: number[];
}

export interface ComputePerformanceByNodeInput {
  orgNodes: OrgNode[];
  orgEdges: [string, string][];
  flags: EnterpriseFlagRecord[];
  meetings: EnterpriseMeetingRecord[];
  transcripts: EnterpriseTranscriptRecord[];
  brainSourceCount?: number;
}

export const computePerformanceByNode = ({
  orgNodes,
  orgEdges,
  flags,
  meetings,
  transcripts,
  brainSourceCount = 0,
}: ComputePerformanceByNodeInput): Record<string, NodePerformanceData> => {
  const childrenByParent = new Map<string, string[]>();
  orgEdges.forEach(([parent, child]) => {
    childrenByParent.set(parent, [...(childrenByParent.get(parent) || []), child]);
  });
  const getDescendantIds = (nodeId: string): string[] => {
    const children = childrenByParent.get(nodeId) || [];
    return children.flatMap((childId) => [childId, ...getDescendantIds(childId)]);
  };

  const scoreMemberWindow = (memberIds: string[], start: number, end: number, tier: TierKey): number[] => {
    const ids = new Set(memberIds.filter(Boolean));
    const relevantTranscripts = transcripts
      .filter((transcript) => {
        const memberId = memberFromTranscript(transcript);
        return ids.size === 0 || ids.has(String(memberId));
      })
      .filter((transcript) => inWindow(transcript.createdAt, start, end));
    const relevantFlags = flags
      .filter((flag) => {
        const flaggedId = getId(flag.flaggedMemberId);
        const managerId = typeof flag.managerId === 'string' ? flag.managerId : '';
        return ids.size === 0 || ids.has(flaggedId) || ids.has(managerId);
      })
      .filter((flag) => inWindow(flag.createdAt || flag.occurredAt, start, end));
    const resolvedFlags = relevantFlags.filter((flag) => flag.status === 'resolved');
    const weightedOpenRisk = relevantFlags
      .filter((flag) => flag.status !== 'resolved')
      .reduce((sum, flag) => sum + severityWeight(flag.severity), 0);
    const wordCounts = relevantTranscripts.map((transcript) => transcript.text.split(/\s+/).filter(Boolean).length);
    const relevantMeetings = meetings.filter((meeting) => {
      if (ids.size === 0) return true;
      const hostId = getId(meeting.hostMemberId);
      const participantIds = (meeting.participantMemberIds || []).map((participant) => getId(participant));
      return ids.has(hostId) || participantIds.some((participantId) => ids.has(participantId));
    });
    const endedMeetings = relevantMeetings.filter((meeting) => meeting.status === 'ended' || meeting.status === 'processed');
    const windowMeetings = endedMeetings.filter((meeting) => inWindow(meeting.meetingDate || meeting.createdAt, start, end));
    const activeSpeakers = new Set(relevantTranscripts.map(memberFromTranscript).filter(Boolean));
    const teamSize = Math.max(1, ids.size);
    const hasActivity = relevantTranscripts.length > 0 || relevantFlags.length > 0 || windowMeetings.length > 0;
    const hasTranscripts = relevantTranscripts.length > 0;

    const base = !hasActivity
      ? [0, 0, 0, 0, 0, 0]
      : [
          clamp01(relevantTranscripts.length / Math.max(6, teamSize * 2)),
          clamp01(average(wordCounts) / 140),
          hasTranscripts ? clamp01(1 - weightedOpenRisk / Math.max(3, relevantTranscripts.length * 2)) : 0,
          hasTranscripts ? clamp01(relevantFlags.length ? resolvedFlags.length / relevantFlags.length : 1) : 0,
          hasTranscripts ? clamp01(1 - relevantFlags.length / Math.max(4, relevantTranscripts.length * 2)) : 0,
          windowMeetings.length > 0
            ? clamp01(relevantTranscripts.length / windowMeetings.length)
            : clamp01(hasTranscripts ? 1 : 0),
        ];

    if (tier === 'mgr') {
      return [clamp01(activeSpeakers.size / teamSize), average([base[0], base[1], base[5]]), base[2], base[3], base[4], base[5]];
    }

    if (tier === 'owner') {
      const brainAdoption = clamp01(brainSourceCount / 8);
      return [
        clamp01(activeSpeakers.size / teamSize),
        clamp01(teamSize / Math.max(1, orgNodes.length - 1 || teamSize)),
        base[2],
        base[3],
        base[4],
        brainAdoption,
      ];
    }

    return base;
  };

  const nowStart = daysAgo(30);
  const prevStart = daysAgo(60);
  const nowEnd = Date.now() + 1;
  const allMemberIds = orgNodes.filter((node) => node.tier !== 'owner').map((node) => node.id);

  return Object.fromEntries(
    orgNodes.map((node) => {
      const tier: TierKey = node.tier === 'mgr' ? 'mgr' : node.tier === 'owner' ? 'owner' : 'rep';
      const ids = tier === 'rep' ? [node.id] : tier === 'mgr' ? [node.id, ...getDescendantIds(node.id)] : allMemberIds;
      return [
        node.id,
        {
          axes: PERFORMANCE_AXES[tier],
          now: scoreMemberWindow(ids, nowStart, nowEnd, tier),
          prev: scoreMemberWindow(ids, prevStart, nowStart, tier),
        },
      ];
    }),
  );
};
