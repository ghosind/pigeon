export enum KeyValueType {
  Text = 'text',
  File = 'file'
}

export type KeyValuePair = {
  key: string
  type?: KeyValueType | ''
  value: string
  enabled?: boolean
}
