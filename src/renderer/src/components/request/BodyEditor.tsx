import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import { useI18n } from '../../contexts/useI18n'
import ModeSelect from './ModeSelect'
import RawEditor from '@renderer/components/common/RawEditor'
import RawControls from './RawControls'
import KeyValueEditor from './KeyValueEditor'
import { BodyMode, RawType, type HTTPBody, type KeyValuePair } from '@shared/types'

type BodyEditorProps = {
  body?: HTTPBody
  onChange: (b: HTTPBody) => void
}

export default function BodyEditor({ body, onChange }: BodyEditorProps): React.ReactElement {
  const { t } = useI18n()
  const [mode, setMode] = React.useState<BodyMode>(body?.mode || BodyMode.None)
  const [language, setLanguage] = React.useState<RawType>(body?.rawType || RawType.JSON)
  const [rawContent, setRawContent] = React.useState<string>(body?.rawContent || '')
  const [formRows, setFormRows] = React.useState<KeyValuePair[]>(body?.formItems || [])
  const [urlRows, setUrlRows] = React.useState<KeyValuePair[]>(body?.urlEncodedItems || [])

  const updateRaw = (content: string): void => {
    setRawContent(content)
    onChange({ mode: BodyMode.Raw, rawType: language, rawContent: content })
  }

  const updateForm = (rows: KeyValuePair[]): void => {
    setFormRows(rows)
    onChange({ mode: BodyMode.FormData, formItems: rows })
  }

  const updateUrl = (rows: KeyValuePair[]): void => {
    setUrlRows(rows)
    onChange({ mode: BodyMode.UrlEncoded, urlEncodedItems: rows })
  }

  const handleModeChange = (m: BodyMode): void => {
    setMode(m)
    switch (m) {
      case BodyMode.None:
        onChange({ mode: BodyMode.None })
        break
      case BodyMode.Raw:
        onChange({ mode: BodyMode.Raw, rawType: language, rawContent })
        break
      case BodyMode.FormData:
        onChange({ mode: BodyMode.FormData, formItems: formRows })
        break
      case BodyMode.UrlEncoded:
        onChange({ mode: BodyMode.UrlEncoded, urlEncodedItems: urlRows })
        break
      case BodyMode.Binary:
        onChange({ mode: BodyMode.Binary, binaryPath: body?.binaryPath || '' })
        break
    }
  }

  const handleLanguageChange = (lang: RawType): void => {
    setLanguage(lang)
    onChange({ mode: BodyMode.Raw, rawType: lang, rawContent })
  }

  const handleFileSelect = async (): Promise<void> => {
    try {
      const path: string | null = await window.api.openFileDialog()
      if (!path) return
      onChange({ mode: BodyMode.Binary, binaryPath: path })
    } catch (e) {
      console.error('[BodyEditor] Open file dialog failed:', e)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <ModeSelect mode={mode} onChange={(m: string) => handleModeChange(m as BodyMode)} />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
          {mode === BodyMode.Raw && (
            <RawControls
              body={rawContent}
              onChange={updateRaw}
              language={language}
              setLanguage={handleLanguageChange}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 1, minHeight: 0 }}>
        {mode === BodyMode.Raw && (
          <RawEditor body={rawContent} onChange={updateRaw} language={language} />
        )}

        {mode === BodyMode.Binary && (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button size="small" onClick={handleFileSelect}>
              {t('request.binary.select')}
            </Button>
            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {body?.binaryPath || ''}
            </Typography>
          </Box>
        )}

        {mode === BodyMode.None && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {t('request.body.noneNotice')}
            </Typography>
          </Box>
        )}

        {mode === BodyMode.FormData && (
          <Box sx={{ height: '100%' }}>
            <KeyValueEditor rows={formRows} onChange={updateForm} allowFile />
          </Box>
        )}

        {mode === BodyMode.UrlEncoded && (
          <Box sx={{ height: '100%' }}>
            <KeyValueEditor rows={urlRows} onChange={updateUrl} />
          </Box>
        )}
      </Box>
    </Box>
  )
}
