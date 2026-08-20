import { normalizePlanValue } from '../lib/auth';

/**
 * Ported from the "Business Intelligence" group + filtering rules in
 * src/Pages/Dashboard.tsx (navGroups + filteredNavGroups) so the mobile app
 * shows the same options per plan as the web dashboard sidebar.
 */
export type Plan =
  | 'free'
  | 'assist'
  | 'spark'
  | 'enterprise'
  | 'enterprise-user'
  | 'enterprise-manager'
  | 'admin';

export interface BusinessIntelligenceItem {
  id: string;
  label: string;
  description: string;
  plans: Plan[];
}

export const BUSINESS_INTELLIGENCE_ITEMS: BusinessIntelligenceItem[] = [
  {
    id: 'holo-assist',
    label: 'Holo-Assist',
    description: 'Live call coaching and real-time prompts.',
    plans: ['spark', 'enterprise', 'enterprise-manager', 'enterprise-user'],
  },
  {
    id: 'analytics',
    label: 'InsightHub',
    description: 'Conversation analytics and performance insights.',
    plans: ['free', 'assist', 'spark'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    description: 'Org-wide rollups, coaching, and compliance views.',
    plans: ['enterprise', 'enterprise-user', 'enterprise-manager'],
  },
];

const ORG_MANAGED_TIERS: Plan[] = ['enterprise', 'enterprise-manager', 'enterprise-user'];

/**
 * Same precedence as Dashboard.tsx's filteredNavGroups: an inactive/cancelled
 * status collapses a self-billed plan down to free-only items; otherwise the
 * subscription tier decides which items are visible.
 */
export function getBusinessIntelligenceItems(
  subscription: string,
  subscriptionStatus?: string,
): BusinessIntelligenceItem[] {
  const plan = (normalizePlanValue(subscription) || 'free') as Plan;
  const status = normalizePlanValue(subscriptionStatus);

  const isOrgManagedTier = ORG_MANAGED_TIERS.includes(plan);
  if (!isOrgManagedTier && (status === 'inactive' || status === 'cancelled' || status === 'past_due')) {
    return BUSINESS_INTELLIGENCE_ITEMS.filter(item => item.plans.includes('free'));
  }

  return BUSINESS_INTELLIGENCE_ITEMS.filter(item => {
    if (plan === 'free') return item.plans.includes('free');
    if (plan === 'spark') return item.plans.some(p => p === 'free' || p === 'assist' || p === 'spark');
    if (plan === 'enterprise') return item.plans.includes('enterprise');
    if (plan === 'enterprise-user') return item.plans.includes('enterprise-user');
    if (plan === 'enterprise-manager') return item.plans.includes('enterprise-manager');
    if (plan === 'admin') return item.plans.includes('admin');
    return item.plans.includes('free');
  });
}
