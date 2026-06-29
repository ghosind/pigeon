import React from 'react'
import type { Collection, CollectionFolder, RequestModel } from '@shared/types'
import CollectionFolderNode from './CollectionFolderNode'

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
  // A Collection is a root node — it has a name and may have folders/requests
  return (
    <CollectionFolderNode
      node={node}
      level={level}
      onOpenRequest={onOpenRequest}
      onRemove={onRemove}
      onAddRequest={onAddRequest}
      onEdit={onEdit}
      onAddFolder={(parentId) => onAddFolder(node.id, parentId)}
      onExport={onExport}
    />
  )
}
