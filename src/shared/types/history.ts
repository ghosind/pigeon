// =========================================================================
// Request history record
// =========================================================================

import type { HTTPMethod } from './enums'

export interface RequestHistoryRecord {
  id: string
  workspaceId?: string
  method: HTTPMethod
  url: string
  statusCode?: number
  costTime?: number
  requestSnapshot: string
  responseSnapshot?: string
  deleted: boolean
  createTime: string
}
