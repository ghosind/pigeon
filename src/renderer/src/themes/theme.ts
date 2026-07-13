import { createTheme } from '@mui/material/styles'

export const pigeonTheme = createTheme({
  spacing: 4,

  shape: {
    borderRadius: 4
  },

  typography: {
    fontSize: 13,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
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
          height: 36
        },
        input: {
          padding: '6px 8px',
          fontSize: '13px'
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
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 4
        }
      }
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 36,
          fontSize: '13px',
          padding: '6px 12px'
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

    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '4px 8px',
          fontSize: '13px'
        },
        head: {
          fontSize: '12px',
          fontWeight: 500
        }
      }
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 4
        }
      }
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4
        }
      }
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
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

    MuiTable: {
      defaultProps: { size: 'small' }
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
    },

    MuiInputBase: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: {
          fontSize: '13px'
        },
        input: {
          padding: '4px 8px'
        }
      }
    }
  }
})
