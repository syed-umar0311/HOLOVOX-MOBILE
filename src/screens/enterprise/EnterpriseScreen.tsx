import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { EnterpriseOverviewScreen } from './EnterpriseOverviewScreen';
import { EnterpriseOrgScreen } from './EnterpriseOrgScreen';
import { EnterpriseCoachScreen } from './EnterpriseCoachScreen';
import { EnterpriseComplianceScreen } from './EnterpriseComplianceScreen';
import { EnterprisePerformanceScreen } from './EnterprisePerformanceScreen';
import { EnterpriseRoiScreen } from './EnterpriseRoiScreen';
import type { ViewType } from '@/types/enterprise';

const TAB_LABEL: Record<ViewType, string> = {
  overview: 'Overview',
  org: 'Organization',
  coach: "Coach's Corner",
  performance: 'Performance',
  compliance: 'Rules',
  roi: 'ROI',
};

// Web renders this as a collapsible sidebar accordion (see navGroups in Dashboard.tsx) —
// collapsed here into a horizontal tab strip, which is the mobile-native equivalent of
// the same role-gated view switcher.
export function EnterpriseScreen() {
  const { colors } = useTheme();
  const { session, token, subscription } = useCurrentUser();
  const enterpriseId = session?.id;
  const isOwner = subscription === 'enterprise';
  const isManager = subscription === 'enterprise-manager';
  const canEdit = isOwner || isManager;

  const tabs: ViewType[] = isOwner
    ? ['overview', 'org', 'coach', 'performance', 'compliance', 'roi']
    : isManager
      ? ['overview', 'org', 'coach', 'performance', 'compliance']
      : ['performance'];

  const [view, setView] = useState<ViewType>(tabs[0]);
  const activeView = tabs.includes(view) ? view : tabs[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {tabs.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { borderColor: colors.border }]}>
          {tabs.map((tab) => (
            <Pressable key={tab} onPress={() => setView(tab)} style={styles.tabBtn}>
              <Text style={{ color: activeView === tab ? colors.primary : colors.mutedForeground, fontSize: 13, fontWeight: activeView === tab ? '700' : '500' }}>
                {TAB_LABEL[tab]}
              </Text>
              {activeView === tab ? <View style={[styles.tabIndicator, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {activeView === 'overview' ? <EnterpriseOverviewScreen token={token} enterpriseId={enterpriseId} /> : null}
      {activeView === 'org' ? <EnterpriseOrgScreen token={token} enterpriseId={enterpriseId} session={session} canEdit={canEdit} /> : null}
      {activeView === 'coach' ? <EnterpriseCoachScreen token={token} enterpriseId={enterpriseId} canEdit={canEdit} /> : null}
      {activeView === 'compliance' ? <EnterpriseComplianceScreen token={token} enterpriseId={enterpriseId} canEdit={canEdit} /> : null}
      {activeView === 'performance' ? <EnterprisePerformanceScreen token={token} enterpriseId={enterpriseId} /> : null}
      {activeView === 'roi' ? <EnterpriseRoiScreen token={token} enterpriseId={enterpriseId} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 12 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 14, alignItems: 'center' },
  tabIndicator: { height: 2, width: '100%', borderRadius: 1, marginTop: 8 },
});
