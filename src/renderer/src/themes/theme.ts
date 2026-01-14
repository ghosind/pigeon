import { createTheme } from '@mui/material/styles'

const CONTROL_HEIGHT = 36

export const pigeonTheme = createTheme({
  spacing: 4,

  shape: {
    borderRadius: 6
  },

  typography: {
    fontSize: 13,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial'
  },
  components: {
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined'
      }
    },

    MuiOutlinedInput: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          height: 40
        },
        input: {
          padding: '8px 10px'
        }
      }
    },

    MuiSelect: {
      defaultProps: {
        size: 'small'
      }
    },

    MuiButton: {
      defaultProps: {
        size: 'small',
        disableElevation: true
      },
      styleOverrides: {
        root: {
          height: 40,
          minWidth: 72,
          textTransform: 'none',
          paddingLeft: 12,
          paddingRight: 12
        }
      }
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 36
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 36,
          padding: '6px 12px',
          textTransform: 'none'
        }
      }
    },

    MuiListItem: {
      styleOverrides: {
        root: {
          paddingTop: 4,
          paddingBottom: 4
        }
      }
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 32,
          paddingTop: 4,
          paddingBottom: 4
        }
      }
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          fontSize: 14
        }
      }
    },

    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: 16
        }
      }
    },

    MuiTable: {
      defaultProps: { size: 'small' }
    },

    MuiTableRow: {
      styleOverrides: {
        root: { height: CONTROL_HEIGHT }
      }
    },

    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '4px 8px',
          height: CONTROL_HEIGHT,
          verticalAlign: 'middle'
        },
        head: {
          fontSize: 12,
          fontWeight: 500,
          color: 'text.secondary',
          alignItems: 'center'
        }
      }
    },

    MuiInputBase: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          height: CONTROL_HEIGHT - 8,
          fontSize: 13
        },
        input: {
          padding: '4px 8px',
          lineHeight: '20px'
        }
      }
    },

    MuiCheckbox: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { padding: 4 }
      }
    },

    MuiIconButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { padding: 4 }
      }
    }
  }
})
