import React from 'react';
import { View } from 'react-native';
import { useOrgTree } from '@/hooks/useOrgTree';
import { OrgTreeView } from '@/components/enterprise/OrgTreeView';
import { NodeDrawer } from '@/components/enterprise/NodeDrawer';
import { EmptyState } from '@/components/ui/EmptyState';
import { sendEnterpriseKnock } from '@/lib/enterpriseKnock';
import { useRootNavigation } from '@/hooks/useRootNavigation';
import type { AuthSession } from '@/types/auth';

interface Props {
  token?: string;
  enterpriseId?: string;
  session: AuthSession | null;
  canEdit: boolean;
}

export function EnterpriseOrgScreen({ token, enterpriseId, session, canEdit }: Props) {
  const { orgNodes, orgEdges, loading, error, drawerNode, openNodeDrawer, closeNodeDrawer, reassignManager, deleteNode } = useOrgTree(
    token,
    enterpriseId,
  );
  const rootNavigation = useRootNavigation();

  if (loading && orgNodes.length === 0) return <EmptyState title="Loading organization…" />;
  if (error) return <EmptyState title="Couldn't load the organization." subtitle={error} />;
  if (orgNodes.length === 0) return <EmptyState title="No organization data yet." />;

  const handleKnock = async (node: import('@/types/enterprise').OrgNode) => {
    if (!enterpriseId) return;
    const meeting = await sendEnterpriseKnock({
      sender: { id: enterpriseId, name: session?.name || 'Someone', email: session?.email, role: 'owner' },
      target: { id: node.id, name: node.name },
      token,
      enterpriseId,
    });
    rootNavigation.navigate('Call', { roomId: meeting.roomId });
  };

  return (
    <View style={{ flex: 1 }}>
      <OrgTreeView nodes={orgNodes} edges={orgEdges} onSelectNode={openNodeDrawer} />
      <NodeDrawer
        node={drawerNode}
        onClose={closeNodeDrawer}
        orgNodes={orgNodes}
        orgEdges={orgEdges}
        canEdit={canEdit}
        onReassign={canEdit ? reassignManager : undefined}
        onDelete={canEdit ? deleteNode : undefined}
        onKnock={handleKnock}
      />
    </View>
  );
}
