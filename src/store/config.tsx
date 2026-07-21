/**
 * Global app state — persisted to COOKIES (no backend, no localStorage), shared
 * via React Context. Mirrors the domain-per-context pattern: components that read
 * members don't re-render when the theme changes, etc.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { readCookieJSON, writeCookieJSON, deleteCookie } from '@/lib/cookies'
import {
  DEFAULT_CONFIG, generateGame, type Member, type StoredGame, type WarConfig,
} from '@/core/game'

const K_MEMBERS = 'kin_members'
const K_THEME = 'kin_theme'
const K_CONFIG = 'kin_config'
const K_GAME = 'kin_game'

// ── ids ───────────────────────────────────────────────────────────────────────

function newId(existing: Set<string>): string {
  let id = ''
  do { id = Math.random().toString(36).slice(2, 8) } while (!id || existing.has(id))
  return id
}

// ── Members ─────────────────────────────────────────────────────────────────

function makeMembersStore() {
  const [members, setMembers] = useState<Member[]>(() => sanitise(readCookieJSON<Member[]>(K_MEMBERS, [])))

  const commit = (next: Member[]): Member[] => { writeCookieJSON(K_MEMBERS, next); return next }

  const addMember = useCallback((rawName: string) => {
    const name = rawName.trim()
    if (!name) return
    setMembers(prev => commit([...prev, { id: newId(new Set(prev.map(m => m.id))), name }]))
  }, [])

  /** Bulk-add already-cleaned names (from paste import). Skips blanks. */
  const addNames = useCallback((names: string[]) => {
    const clean = names.map(n => n.trim()).filter(Boolean)
    if (!clean.length) return
    setMembers(prev => {
      const ids = new Set(prev.map(m => m.id))
      const added: Member[] = clean.map(name => {
        const id = newId(ids)
        ids.add(id)
        return { id, name }
      })
      return commit([...prev, ...added])
    })
  }, [])

  const removeMember = useCallback((id: string) => {
    setMembers(prev => commit(prev.filter(m => m.id !== id)))
  }, [])

  const renameMember = useCallback((id: string, rawName: string) => {
    const name = rawName.trim()
    setMembers(prev => commit(prev.map(m => (m.id === id ? { ...m, name: name || m.name } : m))))
  }, [])

  const clearMembers = useCallback(() => setMembers(() => commit([])), [])

  return { members, addMember, addNames, removeMember, renameMember, clearMembers }
}

/** Drop malformed entries from cookie data and guarantee ids/names are strings. */
function sanitise(raw: unknown): Member[] {
  if (!Array.isArray(raw)) return []
  const out: Member[] = []
  const ids = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const name = typeof (item as Member).name === 'string' ? (item as Member).name : ''
    if (!name.trim()) continue
    let id = typeof (item as Member).id === 'string' ? (item as Member).id : ''
    if (!id || ids.has(id)) id = newId(ids)
    ids.add(id)
    out.push({ id, name })
  }
  return out
}

// ── Theme ─────────────────────────────────────────────────────────────────────

function applyTheme(t: 'light' | 'dark'): void {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

function makeThemeStore() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    const saved = readCookieJSON<'light' | 'dark'>(K_THEME, 'light')
    applyTheme(saved === 'dark' ? 'dark' : 'light')
    return saved === 'dark' ? 'dark' : 'light'
  })
  const toggleTheme = useCallback(() => setThemeState(prev => {
    const next = prev === 'dark' ? 'light' : 'dark'
    writeCookieJSON(K_THEME, next)
    applyTheme(next)
    return next
  }), [])
  return { theme, toggleTheme }
}

// ── Game ──────────────────────────────────────────────────────────────────────

function makeGameStore() {
  const [config, setConfigState] = useState<WarConfig>(() => {
    const c = readCookieJSON<Partial<WarConfig>>(K_CONFIG, DEFAULT_CONFIG)
    return {
      includeEmperor: c.includeEmperor !== false,
      kingdomCount: clampInt(c.kingdomCount ?? DEFAULT_CONFIG.kingdomCount, 1, 6),
    }
  })
  const [game, setGame] = useState<StoredGame | null>(() => readCookieJSON<StoredGame | null>(K_GAME, null))
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  const setConfig = useCallback((patch: Partial<WarConfig>) => {
    setConfigState(prev => {
      const next: WarConfig = {
        includeEmperor: patch.includeEmperor ?? prev.includeEmperor,
        kingdomCount: clampInt(patch.kingdomCount ?? prev.kingdomCount, 1, 6),
      }
      writeCookieJSON(K_CONFIG, next)
      return next
    })
  }, [])

  /** Roll a fresh assignment. Throws (with a French message) if impossible. */
  const generate = useCallback((members: Member[], cfg: WarConfig) => {
    const next = generateGame(members, cfg)
    writeCookieJSON(K_GAME, next)
    setGame(next)
    setSeen(new Set())
  }, [])

  const clearGame = useCallback(() => {
    deleteCookie(K_GAME)
    setGame(null)
    setSeen(new Set())
  }, [])

  const markSeen = useCallback((id: string) => {
    setSeen(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const resetSeen = useCallback(() => setSeen(new Set()), [])

  return { config, setConfig, game, generate, clearGame, seen, markSeen, resetSeen }
}

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

// ── Contexts + provider ─────────────────────────────────────────────────────

type MembersStore = ReturnType<typeof makeMembersStore>
type ThemeStore = ReturnType<typeof makeThemeStore>
type GameStore = ReturnType<typeof makeGameStore>

const MembersCtx = createContext<MembersStore | null>(null)
const ThemeCtx = createContext<ThemeStore | null>(null)
const GameCtx = createContext<GameStore | null>(null)

export function ConfigProvider({ children }: { children: ReactNode }) {
  const members = makeMembersStore()
  const theme = makeThemeStore()
  const game = makeGameStore()
  return (
    <ThemeCtx.Provider value={theme}>
      <MembersCtx.Provider value={members}>
        <GameCtx.Provider value={game}>{children}</GameCtx.Provider>
      </MembersCtx.Provider>
    </ThemeCtx.Provider>
  )
}

export function useMembers(): MembersStore {
  const ctx = useContext(MembersCtx)
  if (!ctx) throw new Error('useMembers must be inside ConfigProvider')
  return ctx
}

export function useTheme(): ThemeStore {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be inside ConfigProvider')
  return ctx
}

export function useGame(): GameStore {
  const ctx = useContext(GameCtx)
  if (!ctx) throw new Error('useGame must be inside ConfigProvider')
  return ctx
}
