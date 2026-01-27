import React from 'react'
import { CollectionNode, Request } from '@shared/types'
import TreeNode from './CollectionTreeNode'

type CollectionTreeProps = {
  nodes: CollectionNode[]
  onOpenRequest: (req: Request) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: CollectionNode) => void
  onAddFolder: (parentId: string | null) => void
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
        <TreeNode
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
