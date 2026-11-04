import type { CollectionNode, RequestDefinition, SavedRequest } from '@shared/types';

export type TreeItem =
  | { kind: 'node'; id: string; node: CollectionNode; children: TreeItem[] }
  | { kind: 'request'; id: string; request: SavedRequest; children: TreeItem[] };

export interface ContainerOption {
  id: string;
  name: string;
  depth: number;
}

export function buildTree(nodes: CollectionNode[], requests: SavedRequest[]): TreeItem[] {
  const byParent = new Map<string | null, TreeItem[]>();
  for (const node of nodes) {
    const item: TreeItem = { kind: 'node', id: node.id, node, children: [] };
    const list = byParent.get(node.parentId) ?? [];
    list.push(item);
    byParent.set(node.parentId, list);
  }
  for (const request of requests) {
    const item: TreeItem = { kind: 'request', id: request.id, request, children: [] };
    const list = byParent.get(request.collectionId) ?? [];
    list.push(item);
    byParent.set(request.collectionId, list);
  }
  const orderOf = (item: TreeItem): number => (item.kind === 'node' ? item.node.order : item.request.order);
  for (const list of byParent.values()) list.sort((a, b) => orderOf(a) - orderOf(b));
  const attach = (parentId: string | null): TreeItem[] =>
    (byParent.get(parentId) ?? []).map((item) => {
      item.children = item.kind === 'node' ? attach(item.id) : [];
      return item;
    });
  return attach(null);
}

export function flattenContainers(nodes: CollectionNode[]): ContainerOption[] {
  const children = new Map<string | null, CollectionNode[]>();
  for (const node of nodes) {
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  for (const list of children.values()) list.sort((a, b) => a.order - b.order);
  const result: ContainerOption[] = [];
  const walk = (parentId: string | null, depth: number): void => {
    for (const node of children.get(parentId) ?? []) {
      result.push({ id: node.id, name: node.name, depth });
      walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export function siblingsFor(
  parentId: string,
  nodes: CollectionNode[],
  requests: SavedRequest[]
): Array<{ id: string; kind: 'node' | 'request'; order: number }> {
  return [
    ...nodes.filter((node) => node.parentId === parentId).map((node) => ({ id: node.id, kind: 'node' as const, order: node.order })),
    ...requests
      .filter((request) => request.collectionId === parentId)
      .map((request) => ({ id: request.id, kind: 'request' as const, order: request.order }))
  ].sort((a, b) => a.order - b.order);
}

export function findRequest(requests: SavedRequest[], id: string | undefined): SavedRequest | undefined {
  return id ? requests.find((request) => request.id === id) : undefined;
}

export function requestFromDefinition(id: string, collectionId: string, definition: RequestDefinition): SavedRequest {
  const now = Date.now();
  return {
    ...definition,
    id,
    collectionId,
    order: 0,
    isDirty: false,
    createdAt: now,
    updatedAt: now
  };
}
