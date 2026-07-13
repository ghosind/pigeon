// =========================================================================
// Client certificate
// =========================================================================

export interface ClientCert {
  id: string
  name: string
  certPath: string
  keyPath?: string
  password?: string
  createTime: string
  updateTime: string
}
