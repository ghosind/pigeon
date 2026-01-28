import React from 'react'
import { CollectionNode, Request } from '@shared/types'
import CollectionFolderNode from './CollectionFolderNode'
import CollectionRequestNode from './CollectionRequestNode'

type CollectionTreeNodeProps = {
  node: CollectionNode
  level: number
  onOpenRequest: (req: Request) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: CollectionNode) => void
  onAddFolder: (parentId: string | null) => void
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
  if (node.type === 'folder') {
    return (
      <CollectionFolderNode
        node={node}
        level={level}
        onOpenRequest={onOpenRequest}
        onRemove={onRemove}
        onAddRequest={onAddRequest}
        onEdit={onEdit}
        onAddFolder={onAddFolder}
        onExport={onExport}
      />
    )
  } else {
    return (
      <CollectionRequestNode
        node={node}
        level={level}
        onOpenRequest={onOpenRequest}
        onRemove={onRemove}
        onEdit={onEdit}
        onExport={onExport}
      />
    )
  }
}
