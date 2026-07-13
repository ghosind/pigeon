import React from 'react'
import { List } from '@mui/material'
import type { Collection, CollectionFolder, RequestModel } from '@shared/types'
import CollectionFolderNode from './CollectionFolderNode'
import CollectionRequestNode from './CollectionRequestNode'

type TreeNode = Collection | CollectionFolder

type CollectionTreeNodeProps = {
  node: Collection
  level: number
  onOpenRequest: (req: RequestModel) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: TreeNode) => void
  onAddFolder: (collectionId: string, parentId?: string | null) => void
  onExport: (id: string) => void
}

export default function CollectionTreeNode({
  node,
  level,
  onOpenRequest,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport
}: CollectionTreeNodeProps): React.JSX.Element {
  const allRequests = node.requests || []
  // Requests without a folderId are top-level
  const topLevelRequests = allRequests.filter((r) => !r.folderId)

  return (
    <List disablePadding>
      {(node.folders || []).map((f) => (
        <CollectionFolderNode
          key={f.id}
          node={f}
          level={level}
          childRequests={allRequests.filter((r) => r.folderId === f.id)}
          onOpenRequest={onOpenRequest}
          onRemove={onRemove}
          onAddRequest={onAddRequest}
          onEdit={onEdit}
          onAddFolder={(parentId) => onAddFolder(node.id, parentId)}
          onExport={onExport}
        />
      ))}
      {topLevelRequests.map(
        (r) =>
          r && (
            <CollectionRequestNode
              key={r.id}
              node={r}
              level={level}
              onOpenRequest={onOpenRequest}
              onRemove={onRemove}
              onEdit={onEdit}
              onExport={onExport}
            />
          )
      )}
    </List>
  )
}
