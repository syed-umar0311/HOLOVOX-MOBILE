import { useCallback, useEffect, useState } from 'react';
import { enterpriseApi } from '@/api/enterpriseApi';
import { layoutTree } from '@/lib/orgTreeLayout';
import type { OrgNode } from '@/types/enterprise';

/** State/data half of web's useEnterpriseOrgTree.ts, ported. The interaction half (pan/
 * zoom/drag via raw mouse events) doesn't port — that's rebuilt with gesture-handler in
 * OrgTreeView.tsx, and node drag-to-reparent is replaced by the picker web's own
 * EnterpriseNodeDrawer already offers as an alternative to dragging (see its `<select>`
 * for manager reassignment) — a better fit for a touchscreen than spatial drag anyway. */
export function useOrgTree(token: string | undefined, enterpriseId: string | undefined) {
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [orgEdges, setOrgEdges] = useState<[string, string][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerNode, setDrawerNode] = useState<OrgNode | null>(null);

  const fetchTree = useCallback(async () => {
    if (!enterpriseId && !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await enterpriseApi.getOrgTree(token, enterpriseId);
      if (data?.nodes) {
        const laidOut = layoutTree(data.nodes, data.edges || []);
        setOrgNodes(laidOut);
        setOrgEdges(data.edges || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization');
    } finally {
      setLoading(false);
    }
  }, [token, enterpriseId]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const reassignManager = useCallback(
    async (repId: string, managerId: string | null) => {
      await enterpriseApi.reparentUser(repId, managerId, token, enterpriseId);
      await fetchTree();
    },
    [token, enterpriseId, fetchTree],
  );

  const deleteNode = useCallback(
    async (node: OrgNode) => {
      await enterpriseApi.deleteUser(node.id, token, enterpriseId);
      if (drawerNode?.id === node.id) setDrawerNode(null);
      await fetchTree();
    },
    [token, enterpriseId, drawerNode, fetchTree],
  );

  return {
    orgNodes,
    orgEdges,
    loading,
    error,
    drawerNode,
    openNodeDrawer: setDrawerNode,
    closeNodeDrawer: () => setDrawerNode(null),
    refresh: fetchTree,
    reassignManager,
    deleteNode,
  };
}
