/**
 * Role-distribution engine.
 *
 * A game has an optional neutral EMPEROR (knows no one) and a list of TEAMS.
 * Each team has a size (or takes the "rest" of the players) and a knowledge
 * RULE that decides who secretly knows whom inside it:
 *
 *   • chief-emperor — one random chief knows the Emperor and no one else; every
 *                     other member knows one random teammate (never the chief).
 *   • random        — each member knows one random teammate.
 *   • loop          — members form a ring; each knows the next one.
 *   • all           — everyone knows every other member of the team.
 *   • emperor       — everyone knows the Emperor.
 *   • none          — nobody knows anyone.
 *
 * The default config reproduces the reference bash script exactly (1 Emperor,
 * 3 chief-emperor kingdoms of 4, and the Qin empire as an "all" team taking the
 * rest). All knowledge is one-directional.
 *
 * Games are stored COMPACTLY (member ids only, plus a snapshot of each team's
 * identity/rule so edits to the config don't rewrite a game already dealt).
 */

import { shuffled } from '@/lib/utils'

export type ColorKey =
  | 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'orange' | 'slate' | 'yellow'

export type RuleKind = 'chief-emperor' | 'random' | 'loop' | 'all' | 'emperor' | 'none'

export interface RuleDef { key: RuleKind; label: string; short: string; desc: string }

export const RULES: RuleDef[] = [
  { key: 'chief-emperor', label: 'Chef + Empereur', short: 'Chef',
    desc: 'Un chef connaît l’Empereur ; les autres connaissent un coéquipier au hasard (jamais le chef).' },
  { key: 'random', label: 'Chacun connaît un coéquipier', short: 'Aléatoire',
    desc: 'Chaque membre connaît un coéquipier tiré au hasard.' },
  { key: 'loop', label: 'Boucle', short: 'Boucle',
    desc: 'Les membres forment une chaîne : chacun connaît le suivant.' },
  { key: 'all', label: 'Tous se connaissent', short: 'Tous',
    desc: 'Tout le monde connaît tous les autres membres de l’équipe.' },
  { key: 'emperor', label: 'Connaît l’Empereur', short: 'Empereur',
    desc: 'Tout le monde connaît l’Empereur.' },
  { key: 'none', label: 'Personne', short: 'Personne',
    desc: 'Personne dans l’équipe ne connaît qui que ce soit.' },
]

export function ruleDef(k: RuleKind): RuleDef {
  return RULES.find(r => r.key === k) ?? RULES[0]
}

export interface TeamPreset { name: string; hanzi: string; emoji: string; color: ColorKey }

/** Identity presets picked (in order) when a new team is added. */
export const TEAM_PRESETS: TeamPreset[] = [
  { name: 'Royaume de Chu',  hanzi: '楚', emoji: '🔴', color: 'red' },
  { name: 'Royaume de Han',  hanzi: '韓', emoji: '🟡', color: 'amber' },
  { name: 'Royaume de Zhao', hanzi: '趙', emoji: '🔵', color: 'blue' },
  { name: 'Empire Qin',      hanzi: '秦', emoji: '⚔️', color: 'slate' },
  { name: 'Royaume de Wei',  hanzi: '魏', emoji: '🟢', color: 'green' },
  { name: 'Royaume de Yan',  hanzi: '燕', emoji: '🟣', color: 'purple' },
  { name: 'Royaume de Qi',   hanzi: '齊', emoji: '🟠', color: 'orange' },
  { name: 'Royaume de Song', hanzi: '宋', emoji: '⚪', color: 'yellow' },
]

export const EMPEROR_DEF = { name: 'L’Empereur — Le Ciel', hanzi: '天', emoji: '👑', color: 'yellow' as ColorKey }

export const MAX_TEAMS = TEAM_PRESETS.length
export const MIN_TEAM_SIZE = 1
export const MAX_TEAM_SIZE = 30

// ── Config ────────────────────────────────────────────────────────────────────

export interface Member { id: string; name: string }

export interface TeamConfig {
  id: string
  name: string
  hanzi: string
  emoji: string
  color: ColorKey
  /** Fixed member count (ignored when `rest` is true). */
  size: number
  /** When true, this team takes all remaining players. At most one team is `rest`. */
  rest: boolean
  rule: RuleKind
}

export interface GameConfig {
  emperor: boolean
  teams: TeamConfig[]
}

export const DEFAULT_CONFIG: GameConfig = {
  emperor: true,
  teams: [
    { id: 'chu',  ...TEAM_PRESETS[0], size: 4, rest: false, rule: 'chief-emperor' },
    { id: 'han',  ...TEAM_PRESETS[1], size: 4, rest: false, rule: 'chief-emperor' },
    { id: 'zhao', ...TEAM_PRESETS[2], size: 4, rest: false, rule: 'chief-emperor' },
    { id: 'qin',  ...TEAM_PRESETS[3], size: 5, rest: true,  rule: 'all' },
  ],
}

// ── Sizing ────────────────────────────────────────────────────────────────────

export interface TeamPlan { team: TeamConfig; size: number }

export interface SizePlan {
  ok: boolean
  error?: string
  emperor: boolean
  plans: TeamPlan[]
  allocated: number
}

const plural = (n: number): string => (n > 1 ? 's' : '')

/** Resolve each team's concrete size for `count` players and validate the total. */
export function planSizes(count: number, config: GameConfig): SizePlan {
  const emperor = config.emperor
  const emperorN = emperor ? 1 : 0

  if (config.teams.length === 0) {
    return { ok: false, error: 'Ajoute au moins une équipe.', emperor, plans: [], allocated: emperorN }
  }

  const restTeam = config.teams.find(t => t.rest) ?? null
  const fixedSum = config.teams.reduce((s, t) => s + (t.rest ? 0 : Math.max(0, t.size)), 0)

  let error: string | undefined
  const plans: TeamPlan[] = config.teams.map(team => {
    if (team.rest && team === restTeam) return { team, size: count - emperorN - fixedSum }
    if (team.rest) return { team, size: 0 } // extra rest teams (shouldn't happen) contribute nothing
    return { team, size: Math.max(0, team.size) }
  })

  if (restTeam) {
    const restSize = count - emperorN - fixedSum
    if (restSize < 1) {
      error = `Trop de joueurs déjà attribués — réduis une équipe (il faut ≥ 1 joueur pour « ${restTeam.name} »).`
    }
  } else {
    const diff = count - emperorN - fixedSum
    if (diff > 0) error = `${diff} joueur${plural(diff)} non attribué${plural(diff)} — agrandis une équipe ou mets-en une sur « reste ».`
    else if (diff < 0) error = `${-diff} joueur${plural(-diff)} en trop — réduis une équipe.`
  }

  const allocated = plans.reduce((a, p) => a + p.size, 0) + emperorN
  return { ok: !error, error, emperor, plans, allocated }
}

// ── Generation ────────────────────────────────────────────────────────────────

export interface StoredTeam {
  teamId: string
  name: string
  hanzi: string
  emoji: string
  color: ColorKey
  rule: RuleKind
  memberIds: string[]
  chiefId: string | null
  /** memberId → the single teammate they know (random / loop / chief-emperor). */
  knows: Record<string, string>
}

export interface StoredGame {
  emperorId: string | null
  teams: StoredTeam[]
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n)
}

export function generateGame(members: Member[], config: GameConfig): StoredGame {
  const plan = planSizes(members.length, config)
  if (!plan.ok) throw new Error(plan.error)

  const deck = shuffled(members)
  let i = 0
  const emperorId = config.emperor ? deck[i++].id : null

  const teams: StoredTeam[] = plan.plans.map(({ team, size }) => {
    const slice = deck.slice(i, i + size)
    i += size
    return buildTeam(team, slice)
  })

  return { emperorId, teams }
}

function buildTeam(team: TeamConfig, slice: Member[]): StoredTeam {
  const ids = slice.map(m => m.id)
  const n = ids.length
  const knows: Record<string, string> = {}
  let chiefId: string | null = null

  switch (team.rule) {
    case 'chief-emperor': {
      if (n > 0) {
        const ci = randInt(n)
        chiefId = ids[ci]
        for (let j = 0; j < n; j++) {
          if (j === ci) continue
          const candidates: number[] = []
          for (let x = 0; x < n; x++) if (x !== j && x !== ci) candidates.push(x)
          if (candidates.length) knows[ids[j]] = ids[candidates[randInt(candidates.length)]]
        }
      }
      break
    }
    case 'random': {
      if (n >= 2) {
        for (let j = 0; j < n; j++) {
          let k = j
          while (k === j) k = randInt(n)
          knows[ids[j]] = ids[k]
        }
      }
      break
    }
    case 'loop': {
      const ring = shuffled(ids)
      if (ring.length >= 2) {
        for (let j = 0; j < ring.length; j++) knows[ring[j]] = ring[(j + 1) % ring.length]
      }
      break
    }
    // 'all', 'emperor', 'none' need no per-member storage — derived at resolve time.
    default:
      break
  }

  return {
    teamId: team.id, name: team.name, hanzi: team.hanzi, emoji: team.emoji, color: team.color,
    rule: team.rule, memberIds: ids, chiefId, knows,
  }
}

// ── Resolution (compact → rich, for display) ──────────────────────────────────

export type TeamKind = 'emperor' | 'team'

export interface PlayerCard {
  memberId: string
  name: string
  teamKind: TeamKind
  teamName: string
  hanzi: string
  emoji: string
  color: ColorKey
  rule: RuleKind
  isChief: boolean
  knowsEmperor?: string | null
  knowsName?: string
  knowsAll?: string[]
}

export interface GroupRow { name: string; isChief: boolean; knowsLabel: string }

export interface GroupView {
  kind: TeamKind
  name: string
  hanzi: string
  emoji: string
  color: ColorKey
  rule: RuleKind
  rows: GroupRow[]
}

export interface ResolvedGame {
  emperorName: string | null
  cards: PlayerCard[]
  cardsById: Record<string, PlayerCard>
  groups: GroupView[]
  missingIds: string[]
}

export function resolveGame(stored: StoredGame, members: Member[]): ResolvedGame {
  const byId = new Map(members.map(m => [m.id, m]))
  const missing = new Set<string>()
  const name = (id: string): string => {
    const m = byId.get(id)
    if (!m) { missing.add(id); return '???' }
    return m.name
  }

  const cards: PlayerCard[] = []
  const cardsById: Record<string, PlayerCard> = {}
  const groups: GroupView[] = []
  const emperorName = stored.emperorId ? name(stored.emperorId) : null

  if (stored.emperorId) {
    const card: PlayerCard = {
      memberId: stored.emperorId, name: name(stored.emperorId), teamKind: 'emperor',
      teamName: EMPEROR_DEF.name, hanzi: EMPEROR_DEF.hanzi, emoji: EMPEROR_DEF.emoji,
      color: EMPEROR_DEF.color, rule: 'none', isChief: false,
    }
    cards.push(card)
    cardsById[card.memberId] = card
    groups.push({
      kind: 'emperor', name: EMPEROR_DEF.name, hanzi: EMPEROR_DEF.hanzi, emoji: EMPEROR_DEF.emoji,
      color: EMPEROR_DEF.color, rule: 'none',
      rows: [{ name: emperorName ?? '???', isChief: false, knowsLabel: 'ne connaît personne' }],
    })
  }

  for (const t of stored.teams) {
    const rows: GroupRow[] = []
    for (const mid of t.memberIds) {
      const isChief = t.chiefId === mid
      const card: PlayerCard = {
        memberId: mid, name: name(mid), teamKind: 'team', teamName: t.name, hanzi: t.hanzi,
        emoji: t.emoji, color: t.color, rule: t.rule, isChief,
      }
      let label: string

      switch (t.rule) {
        case 'chief-emperor':
          if (isChief) {
            card.knowsEmperor = emperorName
            label = emperorName ? `👑 connaît l’Empereur (${emperorName})` : '👑 chef'
          } else if (t.knows[mid]) {
            card.knowsName = name(t.knows[mid]); label = `connaît : ${card.knowsName}`
          } else {
            label = 'ne connaît personne'
          }
          break
        case 'random':
        case 'loop':
          if (t.knows[mid]) { card.knowsName = name(t.knows[mid]); label = `connaît : ${card.knowsName}` }
          else label = 'ne connaît personne'
          break
        case 'all': {
          const others = t.memberIds.filter(x => x !== mid).map(name)
          card.knowsAll = others
          label = others.length ? 'connaît tous les autres' : 'seul membre'
          break
        }
        case 'emperor':
          card.knowsEmperor = emperorName
          label = emperorName ? `connaît l’Empereur (${emperorName})` : 'ne connaît personne'
          break
        default:
          label = 'ne connaît personne'
      }

      rows.push({ name: card.name, isChief, knowsLabel: label })
      cards.push(card)
      cardsById[card.memberId] = card
    }
    groups.push({ kind: 'team', name: t.name, hanzi: t.hanzi, emoji: t.emoji, color: t.color, rule: t.rule, rows })
  }

  return { emperorName, cards, cardsById, groups, missingIds: [...missing] }
}

// ── Plain-text export (for the "copy" button) ─────────────────────────────────

export function formatGameText(resolved: ResolvedGame): string {
  const lines: string[] = ['Répartition des rôles', '']
  for (const g of resolved.groups) {
    const head = g.hanzi ? `${g.emoji} ${g.name} (${g.hanzi})` : `${g.emoji} ${g.name}`
    lines.push(`${head} :`)
    for (const r of g.rows) lines.push(`   - ${r.name}${r.isChief ? '  👑' : ''} — ${r.knowsLabel}`)
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}
