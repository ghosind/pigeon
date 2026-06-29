// =========================================================================
// Environment & variables
// =========================================================================

export interface EnvironmentVariable {
  id: string
  envId: string
  key: string
  value: string
  description?: string
  enabled: boolean
  deleted: boolean
  createTime: string
  updateTime: string
}

export interface Environment {
  id: string
  name: string
  isGlobal: boolean
  isActive: boolean
  sort: number
  deleted: boolean
  createTime: string
  updateTime: string
  variables?: EnvironmentVariable[]
}
