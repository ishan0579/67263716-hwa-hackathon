"use client"

import * as React from "react"

type Theme = "light" | "dark"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
}: ThemeProviderProps) {
  const [theme, setTheme] = React.useState<Theme>(defaultTheme)
  const mounted = React.useRef(false)

  React.useEffect(() => {
    mounted.current = true
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("snifforbit-theme") as Theme | null
      if (stored) setTheme(stored)
      const root = window.document.documentElement
      root.classList.toggle("dark", theme === "dark")
    }
  }, [])

  React.useEffect(() => {
    if (!mounted.current) return
    localStorage.setItem("snifforbit-theme", theme)
    const root = window.document.documentElement
    root.classList.toggle("dark", theme === "dark")
  }, [theme])

  const toggle = React.useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

const ThemeContext = React.createContext<{
  theme: Theme
  toggle: () => void
}>({ theme: "light", toggle: () => {} })

export function useTheme() {
  return React.useContext(ThemeContext)
}
