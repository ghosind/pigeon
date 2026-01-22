import { Theme } from '@mui/material/styles'

export const getMethodColors = (theme: Theme): Record<string, string> => ({
  GET: theme.palette.success.main,
  POST: theme.palette.warning.main,
  PUT: theme.palette.info.main,
  DELETE: theme.palette.error.main,
  PATCH: theme.palette.warning.main,
  OPTIONS: theme.palette.grey[500],
  HEAD: theme.palette.grey[600]
})
