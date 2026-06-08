import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'
import { getStoredTheme, setStoredTheme, applyResolvedTheme } from './themePlatform'

/* ───────────────────────────────────────────────────────────
 * 테마 전역 상태 (React Context)
 *
 * 라이트 / 다크 2가지만 지원한다. (시스템 모드 없음)
 * 기본값은 라이트. 과거에 저장된 'system' 값은 라이트로 흡수한다.
 *
 * theme         : 사용자가 고른 모드 ('light' | 'dark')
 * resolvedTheme : 실제 화면에 적용되는 값 ('light' | 'dark') — theme 과 동일
 * ─────────────────────────────────────────────────────────── */

const THEMES = ['light', 'dark']
const ThemeContext = createContext(null)

// 'dark' 만 다크로, 그 외(system·null·기타)는 라이트로 정규화
function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => normalizeTheme(getStoredTheme()))

  const resolvedTheme = theme

  // 결정된 테마를 화면에 적용 (웹: html.dark 토글)
  useEffect(() => {
    applyResolvedTheme(resolvedTheme)
  }, [resolvedTheme])

  // 특정 모드로 설정 + 저장 (light/dark 외 값은 light 로 정규화)
  const setTheme = useCallback((next) => {
    const value = normalizeTheme(next)
    setThemeState(value)
    setStoredTheme(value)
  }, [])

  // 순환 토글: light ↔ dark
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      setStoredTheme(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      isDark: resolvedTheme === 'dark',
      setTheme,
      cycleTheme,
    }),
    [theme, resolvedTheme, setTheme, cycleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme 는 <ThemeProvider> 안에서만 사용할 수 있어요.')
  return ctx
}

export { THEMES }
