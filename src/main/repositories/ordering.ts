import type { PigeonDatabase } from '../services/database';

/** Returns the next sort order for children of a node inside one workspace. */
export function nextSiblingOrder(db: PigeonDatabase, workspaceId: string, parentId: string | null): number {
  if (parentId === null) {
    const row = db
      .prepare('SELECT COALESCE(MAX(sort_order), 0) AS value FROM collections WHERE workspace_id = ? AND parent_id IS NULL')
      .get(workspaceId) as { value?: number } | undefined;
    return (row?.value ?? 0) + 1000;
  }
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(sort_order), 0) AS value FROM (
         SELECT sort_order FROM collections WHERE workspace_id = ? AND parent_id = ?
         UNION ALL
         SELECT sort_order FROM requests WHERE workspace_id = ? AND collection_id = ?
       )`
    )
    .get(workspaceId, parentId, workspaceId, parentId) as { value?: number } | undefined;
  return (row?.value ?? 0) + 1000;
}
