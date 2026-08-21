import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'inventory-management.theme'

const readStoredTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    // ignore
  }
  try {
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    // ignore
  }
  return 'light'
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readStoredTheme)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
    document.documentElement.dataset.theme = theme
  }, [theme])

  // Apply immediately on first paint too (covers SSR/hydration edge cases)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [])

  const value = useMemo(() => {
    const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
    return { theme, setTheme, toggle }
  }, [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
