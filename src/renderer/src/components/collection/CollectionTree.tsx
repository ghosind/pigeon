import React from 'react'
import type { Collection, CollectionFolder, RequestModel } from '@shared/types'
import CollectionTreeNode from './CollectionTreeNode'

type TreeNode = Collection | CollectionFolder

type CollectionTreeProps = {
  nodes: Collection[]
  onOpenRequest: (req: RequestModel) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: TreeNode) => void
  onAddFolder: (collectionId: string, parentId?: string | null) => void
  onExport: (id: string) => void
}

export default function CollectionTree({
  nodes,
  onOpenRequest,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport
}: CollectionTreeProps): React.ReactElement {
  return (
    <>
      {nodes.map((n) => (
        <CollectionTreeNode
          key={n.id}
          node={n}
          level={0}
          onOpenRequest={onOpenRequest}
          onRemove={onRemove}
          onAddRequest={onAddRequest}
          onEdit={onEdit}
          onAddFolder={onAddFolder}
          onExport={onExport}
        />
      ))}
    </>
  )
}
