import { Box, Typography, Chip, FormControl, Select, MenuItem } from '@mui/material'
import { HTTPResponse } from '@shared/types'
import { formatSize } from '@shared/utils/unit'
import { useI18n } from '../../contexts/useI18n'

type ResponseHeaderProps = {
  response?: HTTPResponse
  panel: string
  setPanel: (p: string) => void
  language?: string
  setLanguage: (lang: string) => void
}

export default function ResponseHeader({
  response,
  panel,
  setPanel,
  language,
  setLanguage
}: ResponseHeaderProps): React.ReactElement | null {
  const { t } = useI18n()

  if (!response) {
    return (
      <Box sx={{ mb: 1, p: 1 }}>
        <Typography>{t('response.header.title')}</Typography>
      </Box>
    )
  }

  const status = response ? response.status : null
  const statusText = response ? response.statusText : ''
  const timeMs = response?.duration
  const size =
    response?.size ?? (typeof response?.body === 'string' ? response.body.length : undefined)

  return (
    <Box sx={{ mb: 1, minHeight: 40 }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ ml: 2, minWidth: 100 }} variant="standard">
          <Select value={panel} onChange={(e) => setPanel(e.target.value as string)}>
            <MenuItem value="body">{t('response.tab.body')}</MenuItem>
            <MenuItem value="headers">{t('response.tab.headers')}</MenuItem>
          </Select>
        </FormControl>

        {panel === 'body' && (
          <FormControl size="small" sx={{ ml: 2, minWidth: 100 }} variant="standard">
            <Select value={language} onChange={(e) => setLanguage(e.target.value as string)}>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="xml">XML</MenuItem>
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="text">Text</MenuItem>
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{t('response.header.status')}</Typography>
          <Chip
            label={`${(status && `${status} `) ?? ''} ${statusText ?? ''}`}
            color={!status || status >= 400 ? 'error' : 'success'}
            size="small"
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{t('response.header.time')}</Typography>
          <Typography variant="body2">
            {timeMs ? `${timeMs} ms` : t('response.header.noValue')}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{t('response.header.size')}</Typography>
          <Typography variant="body2">{formatSize(size)}</Typography>
        </Box>
      </Box>
    </Box>
  )
}
