import React, { useMemo, useCallback } from 'react'
import { Box, List, useTheme, Paper } from '@mui/material'
import { useRequestManager, HistoryItem } from '@renderer/contexts/useRequestManager'
import { useI18n } from '@renderer/contexts/useI18n'
import HistoryGroup from './HistoryGroup'

export default function HistoryPanelRefactor(): React.JSX.Element {
  const { history, openRequest } = useRequestManager()
  const theme = useTheme()
  const { t, lang } = useI18n()

  const formatGroupKey = useCallback(
    (d: Date): string => {
      const sameDay = (a: Date, b: Date): boolean =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()

      const today = new Date()
      if (sameDay(d, today)) return t('history.group.today')
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)
      if (sameDay(d, yesterday)) return t('history.group.yesterday')
      return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(d)
    },
    [lang, t]
  )

  const groups = useMemo((): Array<{ key: string; items: HistoryItem[] }> => {
    const map = new Map<string, HistoryItem[]>()
    history.forEach((h: HistoryItem) => {
      const key = formatGroupKey(new Date(h.ts))
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(h)
    })
    const arr = Array.from(map.entries()).map(([key, items]) => ({ key, items }))
    arr.sort((a, b) => (b.items[0].ts ?? 0) - (a.items[0].ts ?? 0))
    return arr
  }, [history, formatGroupKey])

  return (
    <Box
      sx={{
        background: theme.palette.background.default,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ mb: 1, fontWeight: 600 }}>{t('history.title')}</Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {groups.length === 0 && (
            <Box sx={{ p: 2, color: theme.palette.text.secondary }}>{t('history.empty')}</Box>
          )}
          {groups.map((g) => (
            <HistoryGroup key={g.key} title={g.key} items={g.items} openRequest={openRequest} />
          ))}
        </List>
      </Paper>
    </Box>
  )
}
