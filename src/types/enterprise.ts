// Ported from src/Pages/enterprise/types.ts and src/Pages/enterprise/api/enterpriseApi.ts —
// field names kept identical since these map straight to backend JSON.

export type ViewType = 'overview' | 'org' | 'coach' | 'performance' | 'compliance' | 'roi';

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  tier: 'owner' | 'mgr' | 'rep';
  initials: string;
  color: string;
  meta: { sessions: string; cards: string; flags: string };
  status: 'live' | 'idle' | 'flag';
  x: number;
  y: number;
  email?: string;
}

export interface EnterpriseOverviewData {
  kpis: Array<{ value: string; label: string; delta: string; deltaType: 'up' | 'down'; hot?: boolean }>;
  divisions: Array<{ name: string; status: string; statusType: 'good' | 'warn'; sub: string }>;
  brainSources: Array<{ id?: string; category: string; name: string; type: string; icon: string; status: string; createdAt?: string }>;
  brainReadiness?: { company: number; personal: number; combined: number };
  feed: Array<{ color: string; text: string; time: string }>;
  leaderboard: Array<{ name: string; team: string; color: string; score: string; delta: string }>;
}

export interface EnterpriseOrgTreeData {
  nodes: OrgNode[];
  edges: [string, string][];
}

export interface EnterpriseKnockTarget {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'rep';
}

export interface EnterpriseMemberRef {
  _id?: string;
  fullName?: string;
  email?: string;
  role?: 'manager' | 'user';
  parentId?: string;
}

export interface EnterpriseFlagWord {
  _id: string;
  word: string;
  normalizedWord?: string;
  type: 'flag' | 'permitted';
  severity: 'low' | 'medium' | 'high';
  category?: string;
  createdAt?: string;
}

export interface EnterpriseFlagRecord {
  _id: string;
  meetingId: string;
  flagWordId?: EnterpriseFlagWord | string;
  flaggedMemberId?: EnterpriseMemberRef | string | null;
  speakerMemberId?: EnterpriseMemberRef | string | null;
  managerId?: string | null;
  matchedWord: string;
  severity: 'low' | 'medium' | 'high';
  category?: string;
  quote?: string;
  status: 'flagged' | 'manager_review' | 'rep_coached' | 'repaired' | 'resolved';
  coachingMeetingId?: string;
  occurredAt?: string;
  createdAt?: string;
  resolvedAt?: string | null;
}

export interface EnterpriseMeetingRecord {
  _id: string;
  organizationId: string;
  meetingId: string;
  meetingTitle?: string;
  meetingDate?: string;
  status?: 'created' | 'live' | 'ended' | 'processed';
  hostMemberId?: EnterpriseMemberRef | string | null;
  participantMemberIds?: Array<EnterpriseMemberRef | string>;
  createdAt?: string;
}

export interface EnterpriseTranscriptRecord {
  _id: string;
  meetingId: string;
  participantMemberId?: string | null;
  speakerMemberId?: string | null;
  text: string;
  createdAt?: string;
}
