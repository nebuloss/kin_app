/**
 * Global app state — persisted to COOKIES (no backend, no localStorage), shared
 * via React Context. Mirrors the domain-per-context pattern: components that read
 * members don't re-render when the theme changes, etc.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { readCookieJSON, writeCookieJSON, deleteCookie } from '@/lib/cookies'
import {
  DEFAULT_CONFIG, generateGame, TEAM_PRESETS, MAX_TEAMS, MIN_TEAM_SIZE, MAX_TEAM_SIZE, RULES,
  type Member, type StoredGame, type GameConfig, type TeamConfig, type ColorKey, type RuleKind,
} from '@/core/game'

const COLOR_KEYS: ColorKey[] = ['red', 'amber', 'blue', 'green', 'purple', 'orange', 'slate', 'yellow']
const RULE_KEYS: RuleKind[] = RULES.map(r => r.key)

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
  const [config, setConfigState] = useState<GameConfig>(() => normaliseConfig(readCookieJSON<GameConfig>(K_CONFIG, DEFAULT_CONFIG)))
  const [game, setGame] = useState<StoredGame | null>(() => {
    // Discard games written by an older schema (no `teams` array) so resolveGame can't crash.
    const g = readCookieJSON<StoredGame | null>(K_GAME, null)
    return g && Array.isArray(g.teams) ? g : null
  })
  const [seen, setSeen] = useState<Set<string>>(() => new Set())

  const commitConfig = (next: GameConfig): GameConfig => { writeCookieJSON(K_CONFIG, next); return next }

  const setEmperor = useCallback((on: boolean) => {
    setConfigState(prev => commitConfig({ ...prev, emperor: on }))
  }, [])

  const updateTeam = useCallback((id: string, patch: Partial<TeamConfig>) => {
    setConfigState(prev => commitConfig({
      ...prev,
      teams: prev.teams.map(t => (t.id === id ? clampTeam({ ...t, ...patch }) : t)),
    }))
  }, [])

  /** Set (or clear) which team absorbs the leftover players. At most one may be `rest`. */
  const toggleRest = useCallback((id: string, on: boolean) => {
    setConfigState(prev => commitConfig({
      ...prev,
      teams: prev.teams.map(t => (t.id === id ? { ...t, rest: on } : (on ? { ...t, rest: false } : t))),
    }))
  }, [])

  const addTeam = useCallback(() => {
    setConfigState(prev => {
      if (prev.teams.length >= MAX_TEAMS) return prev
      const usedNames = new Set(prev.teams.map(t => t.name))
      const preset = TEAM_PRESETS.find(p => !usedNames.has(p.name)) ?? TEAM_PRESETS[prev.teams.length % TEAM_PRESETS.length]
      const id = newId(new Set(prev.teams.map(t => t.id)))
      const team: TeamConfig = { id, ...preset, size: 4, rest: false, rule: 'random' }
      return commitConfig({ ...prev, teams: [...prev.teams, team] })
    })
  }, [])

  const removeTeam = useCallback((id: string) => {
    setConfigState(prev => commitConfig({ ...prev, teams: prev.teams.filter(t => t.id !== id) }))
  }, [])

  /** Roll a fresh assignment. Throws (with a French message) if impossible. */
  const generate = useCallback((members: Member[], cfg: GameConfig) => {
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

  return { config, setEmperor, updateTeam, toggleRest, addTeam, removeTeam, game, generate, clearGame, seen, markSeen, resetSeen }
}

function clampInt(v: number, lo: number, hi: number): number {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

function clampTeam(t: TeamConfig): TeamConfig {
  return { ...t, size: clampInt(t.size, MIN_TEAM_SIZE, MAX_TEAM_SIZE), name: t.name.trim() ? t.name : 'Équipe' }
}

/** Validate config loaded from a cookie; fall back to DEFAULT_CONFIG if unusable. */
function normaliseConfig(c: GameConfig | null): GameConfig {
  if (!c || !Array.isArray(c.teams) || c.teams.length === 0) return DEFAULT_CONFIG
  const ids = new Set<string>()
  const teams: TeamConfig[] = []
  let restSeen = false
  for (const raw of c.teams) {
    if (!raw || typeof raw !== 'object') continue
    let id = typeof raw.id === 'string' && raw.id ? raw.id : newId(ids)
    if (ids.has(id)) id = newId(ids)
    ids.add(id)
    let rest = raw.rest === true
    if (rest && restSeen) rest = false // enforce a single rest team
    if (rest) restSeen = true
    teams.push({
      id,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Équipe',
      hanzi: typeof raw.hanzi === 'string' ? raw.hanzi : '',
      emoji: typeof raw.emoji === 'string' && raw.emoji ? raw.emoji : '⚪',
      color: COLOR_KEYS.includes(raw.color) ? raw.color : 'slate',
      rule: RULE_KEYS.includes(raw.rule) ? raw.rule : 'random',
      rest,
      size: clampInt(typeof raw.size === 'number' ? raw.size : 4, MIN_TEAM_SIZE, MAX_TEAM_SIZE),
    })
  }
  if (!teams.length) return DEFAULT_CONFIG
  return { emperor: c.emperor !== false, teams }
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
