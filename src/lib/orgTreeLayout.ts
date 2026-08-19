import type { OrgNode } from '@/types/enterprise';

// Pure tree-layout math ported from useEnterpriseOrgTree.ts's layoutTree/getNearestDropTarget/
// parentOf/isDescendant. The pan/zoom/drag *interaction* code around it was mouse-event-based
// and doesn't port — that's rebuilt with react-native-gesture-handler in useOrgTree.ts — but
// this positioning logic is framework-agnostic and kept unchanged.

export const ORG_NODE_PALETTE = ['#E51A54', '#7d2bd6', '#0E0E77', '#2b8fd6', '#9c2bb0', '#1E9E5A', '#b8860b'];

export const NODE_WIDTH = 150;
export const NODE_HEIGHT = 78;
const COLW = 172;
const ROWH = 150;

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/).filter((p) => p.length > 0);
  if (parts.length === 0) return name.charAt(0).toUpperCase();
  return parts.map((p) => p.charAt(0).toUpperCase()).slice(0, 2).join('');
}

export function parentOf(id: string, edges: [string, string][]): string | null {
  const edge = edges.find((entry) => entry[1] === id);
  return edge ? edge[0] : null;
}

export function isDescendant(ancestorId: string, possibleDescendantId: string | null, edges: [string, string][]): boolean {
  if (!possibleDescendantId) return false;
  let current: string | null = possibleDescendantId;
  while (current) {
    current = parentOf(current, edges);
    if (current === ancestorId) return true;
  }
  return false;
}

export function layoutTree(nodesInput: OrgNode[], edgesInput: [string, string][]): OrgNode[] {
  let leaf = 0;
  const nodesCopy = nodesInput.map((n) => ({ ...n }));

  const place = (id: string, depth: number) => {
    const node = nodesCopy.find((n) => n.id === id);
    if (!node) return;
    const children = edgesInput.filter((e) => e[0] === id).map((e) => e[1]);
    node.y = depth * ROWH + 20;
    if (children.length === 0) {
      node.x = leaf * COLW + 20;
      leaf++;
    } else {
      children.forEach((childId) => place(childId, depth + 1));
      const childXs = children.map((childId) => nodesCopy.find((n) => n.id === childId)?.x || 0);
      node.x = (Math.min(...childXs) + Math.max(...childXs)) / 2;
    }
  };

  const root = nodesCopy.find((n) => !edgesInput.some((e) => e[1] === n.id));
  if (root) place(root.id, 0);
  return nodesCopy;
}

export function getNearestDropTarget(movingNodeId: string, nodes: OrgNode[]): OrgNode | null {
  const movingNode = nodes.find((n) => n.id === movingNodeId);
  if (!movingNode) return null;

  const movingCenterX = movingNode.x + NODE_WIDTH / 2;
  const movingCenterY = movingNode.y + NODE_HEIGHT / 2;

  let bestTarget: OrgNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  nodes.forEach((candidate) => {
    if (candidate.id === movingNodeId) return;
    const candidateCenterX = candidate.x + NODE_WIDTH / 2;
    const candidateCenterY = candidate.y + NODE_HEIGHT / 2;
    const distance = Math.hypot(candidateCenterX - movingCenterX, candidateCenterY - movingCenterY);
    if (distance < 180 && distance < bestDistance) {
      bestDistance = distance;
      bestTarget = candidate;
    }
  });

  return bestTarget;
}
