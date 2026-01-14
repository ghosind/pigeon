import { createTheme } from '@mui/material/styles'
import { pigeonTheme } from './theme'

export const lightTheme = createTheme({
  ...pigeonTheme,
  palette: {
    mode: 'light'
  }
})

export const darkTheme = createTheme({
  ...pigeonTheme,
  palette: {
    mode: 'dark',
    background: {
      default: '#121212',
      paper: '#1e1e1e'
    }
  }
})
