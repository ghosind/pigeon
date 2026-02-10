import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useI18n } from '../../contexts/useI18n'
import ModeSelect from './ModeSelect'
import RawEditor from '@renderer/components/common/RawEditor'
import RawControls from './RawControls'
import KeyValueEditor from './KeyValueEditor'
import { KeyValuePair } from '@shared/types/kv'
import { HTTPBody, HTTPBodyMode, HTTPContentType } from '@shared/types'

type BodyEditorProps = {
  body?: HTTPBody
  onChange: (b: HTTPBody) => void
}

const ContentTypeMap: Record<HTTPBodyMode, HTTPContentType | ''> = {
  raw: 'json',
  form: 'form',
  urlencoded: 'urlencoded',
  none: 'text',
  binary: ''
}

export default function BodyEditor({ body, onChange }: BodyEditorProps): React.ReactElement {
  const { t } = useI18n()
  const [mode, setMode] = React.useState<HTTPBodyMode>(body?.mode || 'raw')
  const [language, setLanguage] = React.useState<HTTPContentType>('json')
  const [formRows, setFormRows] = React.useState<KeyValuePair[]>(body?.form ?? [])
  const [urlRows, setUrlRows] = React.useState<KeyValuePair[]>(body?.urlencoded ?? [])

  const updateRaw = (s: string): void => {
    const prev = body ?? ({ mode: 'raw' } as HTTPBody)
    onChange({ ...prev, mode: 'raw', data: s })
  }

  const updateForm = (rows: KeyValuePair[]): void => {
    setFormRows(rows)
    const prev = body ?? ({ mode: 'form' } as HTTPBody)
    onChange({ ...prev, mode: 'form', form: rows })
  }

  const updateUrl = (rows: KeyValuePair[]): void => {
    setUrlRows(rows)
    const prev = body ?? ({ mode: 'urlencoded' } as HTTPBody)
    onChange({ ...prev, mode: 'urlencoded', urlencoded: rows })
  }

  const handleModeChange = (m: HTTPBodyMode): void => {
    const prev = body ?? ({ mode: m } as HTTPBody)
    let contentType: HTTPContentType | '' = ContentTypeMap[m]
    if (m === 'raw') {
      contentType = language
    }

    const next: HTTPBody = { ...prev, mode: m, contentType: contentType || undefined }
    setMode(m)
    onChange(next)
  }

  const handleLanguageChange = (lang: HTTPContentType): void => {
    setLanguage(lang)
    const prev = body ?? ({ mode: 'raw' } as HTTPBody)
    onChange({ ...prev, mode: 'raw', contentType: lang })
  }

  const handleFileSelect = async (): Promise<void> => {
    try {
      const path: string | null = await window.api.openFileDialog()
      if (!path) {
        return
      }
      const prev = body ?? ({ mode: 'binary' } as HTTPBody)
      onChange({ ...prev, mode: 'binary', filePath: path })
    } catch (e) {
      console.error('open file dialog failed', e)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <ModeSelect mode={mode} onChange={(m: string) => handleModeChange(m as HTTPBodyMode)} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
          {mode === 'raw' && (
            <RawControls
              body={typeof body === 'string' ? (body as string) : (body as HTTPBody)?.data || ''}
              onChange={updateRaw}
              language={language}
              setLanguage={handleLanguageChange}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 1, minHeight: 0 }}>
        {mode === 'raw' && (
          <RawEditor
            body={typeof body === 'string' ? (body as string) : (body as HTTPBody)?.data || ''}
            onChange={updateRaw}
            language={language}
          />
        )}

        {mode === 'binary' && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" onClick={handleFileSelect}>
              {t('request.binary.select')}
            </Button>
            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {body?.filePath || ''}
            </Typography>
          </Box>
        )}

        {mode === 'none' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('request.body.noneNotice')}
            </Typography>
          </Box>
        )}

        {mode === 'form' && (
          <Box sx={{ height: '100%' }}>
            <KeyValueEditor rows={formRows} onChange={updateForm} allowFile />
          </Box>
        )}

        {mode === 'urlencoded' && (
          <Box sx={{ height: '100%' }}>
            <KeyValueEditor rows={urlRows} onChange={updateUrl} />
          </Box>
        )}
      </Box>
    </Box>
  )
}
