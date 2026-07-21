/**
 * Warring States — role distribution engine.
 *
 * Faithful port of the reference bash script (répartition Chine antique), made
 * to work for any number of players instead of a hard-coded 18.
 *
 * Structure:
 *   • 1 neutral EMPEROR ("Le Ciel"), above the kingdoms, knows no one.
 *   • N rival KINGDOMS (default 3: Chu, Han, Zhao). Each kingdom has:
 *       – one random CHIEF, who knows the Emperor and no one else in the team;
 *       – other members, who each secretly know ONE teammate (never themselves,
 *         never the chief).
 *   • 1 QIN empire (the invaders): everyone in it knows all the others.
 *
 * All knowledge is one-directional (A knowing B does not mean B knows A).
 *
 * The generated game is stored COMPACTLY (member ids only) so it fits in a
 * cookie; display names/secrets are resolved from the member list at render.
 */

import { shuffled } from '@/lib/utils'

export type ColorKey =
  | 'red' | 'amber' | 'blue' | 'green' | 'purple' | 'orange' | 'slate' | 'yellow'

export interface KingdomDef {
  key: string
  name: string
  hanzi: string
  emoji: string
  color: ColorKey
}

/** Rival kingdoms, in the order they are filled (first `kingdomCount` are used). */
export const KINGDOM_DEFS: KingdomDef[] = [
  { key: 'chu',  name: 'Royaume de Chu',  hanzi: '楚', emoji: '🔴', color: 'red' },
  { key: 'han',  name: 'Royaume de Han',  hanzi: '韓', emoji: '🟡', color: 'amber' },
  { key: 'zhao', name: 'Royaume de Zhao', hanzi: '趙', emoji: '🔵', color: 'blue' },
  { key: 'wei',  name: 'Royaume de Wei',  hanzi: '魏', emoji: '🟢', color: 'green' },
  { key: 'yan',  name: 'Royaume de Yan',  hanzi: '燕', emoji: '🟣', color: 'purple' },
  { key: 'qi',   name: 'Royaume de Qi',   hanzi: '齊', emoji: '🟠', color: 'orange' },
]

export const QIN_DEF = { name: 'Empire Qin', hanzi: '秦', emoji: '⚔️', color: 'slate' as ColorKey }
export const EMPEROR_DEF = { name: 'L’Empereur — Le Ciel', hanzi: '天', emoji: '👑', color: 'yellow' as ColorKey }

export const MAX_KINGDOMS = KINGDOM_DEFS.length
export const MIN_KINGDOM_SIZE = 3 // a non-chief member must have someone (≠ self, ≠ chief) to know

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Member { id: string; name: string }

export interface WarConfig {
  includeEmperor: boolean
  kingdomCount: number
}

export const DEFAULT_CONFIG: WarConfig = { includeEmperor: true, kingdomCount: 3 }

/** Compact, cookie-storable game: references members by id only. */
export interface StoredGame {
  emperorId: string | null
  /** One entry per kingdom, in KINGDOM_DEFS order. */
  kingdoms: Array<{
    defKey: string
    chiefId: string
    /** memberId → id of the teammate they secretly know (non-chief members only). */
    knows: Record<string, string>
  }>
  qinIds: string[]
}

export interface SizePlan {
  ok: boolean
  error?: string
  emperor: boolean
  kingdomSizes: number[]
  qinSize: number
  minPlayers: number
}

// ── Sizing ──────────────────────────────────────────────────────────────────

/**
 * Work out how many players go where, for `count` players and the given config.
 * Kingdoms are balanced; the Qin empire absorbs the remainder (so the invaders
 * are the largest group — matching the reference script's 4/4/4/5 split of 17).
 */
export function planSizes(count: number, config: WarConfig): SizePlan {
  const emperor = config.includeEmperor
  const K = Math.max(1, Math.min(MAX_KINGDOMS, config.kingdomCount))
  const groups = K + 1 // kingdoms + Qin
  const minPlayers = MIN_KINGDOM_SIZE * groups + (emperor ? 1 : 0)

  const rest = count - (emperor ? 1 : 0)
  const base = Math.floor(rest / groups)
  const rem = rest - base * groups
  const kingdomSizes = Array<number>(K).fill(base)
  const qinSize = base + rem

  if (count < minPlayers || base < MIN_KINGDOM_SIZE) {
    return {
      ok: false,
      error: `Il faut au moins ${minPlayers} joueurs pour ${K} royaume${K > 1 ? 's' : ''} + l’Empire Qin (chaque groupe ≥ ${MIN_KINGDOM_SIZE}).`,
      emperor, kingdomSizes, qinSize, minPlayers,
    }
  }
  return { ok: true, emperor, kingdomSizes, qinSize, minPlayers }
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n)
}

// ── Generation ────────────────────────────────────────────────────────────────

/** Randomly assign roles. Throws if the config can't be satisfied for this list. */
export function generateGame(members: Member[], config: WarConfig): StoredGame {
  const plan = planSizes(members.length, config)
  if (!plan.ok) throw new Error(plan.error)

  const deck = shuffled(members)
  let i = 0
  const emperorId = plan.emperor ? deck[i++].id : null

  const kingdoms: StoredGame['kingdoms'] = []
  for (let k = 0; k < plan.kingdomSizes.length; k++) {
    const size = plan.kingdomSizes[k]
    const slice = deck.slice(i, i + size)
    i += size

    const chiefIdx = randInt(slice.length)
    const knows: Record<string, string> = {}
    for (let j = 0; j < slice.length; j++) {
      if (j === chiefIdx) continue
      // Candidates: any teammate that is not this member and not the chief.
      const candidates: number[] = []
      for (let x = 0; x < slice.length; x++) {
        if (x !== j && x !== chiefIdx) candidates.push(x)
      }
      const pick = candidates[randInt(candidates.length)]
      knows[slice[j].id] = slice[pick].id
    }
    kingdoms.push({ defKey: KINGDOM_DEFS[k].key, chiefId: slice[chiefIdx].id, knows })
  }

  const qinIds = deck.slice(i).map(m => m.id)
  return { emperorId, kingdoms, qinIds }
}

// ── Resolution (compact → rich, for display) ──────────────────────────────────

export type TeamKind = 'emperor' | 'kingdom' | 'qin'

export interface PlayerCard {
  memberId: string
  name: string
  teamKind: TeamKind
  teamName: string
  hanzi: string
  emoji: string
  color: ColorKey
  isChief: boolean
  /** Emperor's name — set for kingdom chiefs when an Emperor exists. */
  knowsEmperor?: string | null
  /** A single teammate's name — set for regular kingdom members. */
  knowsName?: string
  /** All fellow invaders' names — set for Qin members. */
  knowsAll?: string[]
}

export interface GroupRow {
  name: string
  isChief: boolean
  knowsLabel: string
}

export interface GroupView {
  kind: TeamKind
  name: string
  hanzi: string
  emoji: string
  color: ColorKey
  rows: GroupRow[]
}

export interface ResolvedGame {
  emperorName: string | null
  /** One card per player, keyed for private ("pass the phone") reveal. */
  cards: PlayerCard[]
  cardsById: Record<string, PlayerCard>
  /** Grouped view for the game leader. */
  groups: GroupView[]
  /** Ids referenced by the game that no longer exist in the member list. */
  missingIds: string[]
}

/** Resolve a stored game against the current member list into display data. */
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
      memberId: stored.emperorId,
      name: name(stored.emperorId),
      teamKind: 'emperor',
      teamName: EMPEROR_DEF.name,
      hanzi: EMPEROR_DEF.hanzi,
      emoji: EMPEROR_DEF.emoji,
      color: EMPEROR_DEF.color,
      isChief: false,
    }
    cards.push(card)
    cardsById[card.memberId] = card
    groups.push({
      kind: 'emperor', name: EMPEROR_DEF.name, hanzi: EMPEROR_DEF.hanzi,
      emoji: EMPEROR_DEF.emoji, color: EMPEROR_DEF.color,
      rows: [{ name: emperorName ?? '???', isChief: false, knowsLabel: 'ne connaît personne' }],
    })
  }

  for (const kingdom of stored.kingdoms) {
    const def = KINGDOM_DEFS.find(d => d.key === kingdom.defKey) ?? KINGDOM_DEFS[0]
    const rows: GroupRow[] = []
    // Members of a kingdom = chief + everyone appearing in `knows`.
    const memberIds = [kingdom.chiefId, ...Object.keys(kingdom.knows)]
    for (const mid of memberIds) {
      const isChief = mid === kingdom.chiefId
      const card: PlayerCard = {
        memberId: mid,
        name: name(mid),
        teamKind: 'kingdom',
        teamName: def.name,
        hanzi: def.hanzi,
        emoji: def.emoji,
        color: def.color,
        isChief,
      }
      if (isChief) {
        card.knowsEmperor = emperorName
        rows.push({
          name: card.name, isChief: true,
          knowsLabel: emperorName ? `connaît l’Empereur (${emperorName})` : 'ne connaît personne dans le royaume',
        })
      } else {
        const knownName = name(kingdom.knows[mid])
        card.knowsName = knownName
        rows.push({ name: card.name, isChief: false, knowsLabel: `connaît : ${knownName}` })
      }
      cards.push(card)
      cardsById[card.memberId] = card
    }
    groups.push({ kind: 'kingdom', name: def.name, hanzi: def.hanzi, emoji: def.emoji, color: def.color, rows })
  }

  if (stored.qinIds.length) {
    const rows: GroupRow[] = []
    for (const mid of stored.qinIds) {
      const myName = name(mid)
      const others = stored.qinIds.filter(x => x !== mid).map(name)
      const card: PlayerCard = {
        memberId: mid,
        name: myName,
        teamKind: 'qin',
        teamName: QIN_DEF.name,
        hanzi: QIN_DEF.hanzi,
        emoji: QIN_DEF.emoji,
        color: QIN_DEF.color,
        isChief: false,
        knowsAll: others,
      }
      cards.push(card)
      cardsById[card.memberId] = card
      rows.push({ name: myName, isChief: false, knowsLabel: 'connaît tous les autres envahisseurs' })
    }
    groups.push({
      kind: 'qin', name: QIN_DEF.name, hanzi: QIN_DEF.hanzi, emoji: QIN_DEF.emoji, color: QIN_DEF.color, rows,
    })
  }

  return { emperorName, cards, cardsById, groups, missingIds: [...missing] }
}

// ── Plain-text export (for the "copy" button) ─────────────────────────────────

/** Render the full leader breakdown as plain text, echoing the reference script. */
export function formatGameText(resolved: ResolvedGame): string {
  const lines: string[] = ['Royaumes combattants — répartition', '']
  for (const g of resolved.groups) {
    if (g.kind === 'emperor') {
      lines.push(`${g.emoji} ${g.name} — ne connaît personne :`)
      for (const r of g.rows) lines.push(`   - ${r.name}`)
    } else if (g.kind === 'kingdom') {
      lines.push(`${g.emoji} ${g.name} (${g.hanzi}) :`)
      for (const r of g.rows) {
        lines.push(`   - ${r.name}${r.isChief ? '  👑 CHEF' : ''} — ${r.knowsLabel}`)
      }
    } else {
      lines.push(`${g.emoji} ${g.name} (${g.hanzi}) — les envahisseurs, tous se connaissent :`)
      for (const r of g.rows) lines.push(`   - ${r.name}`)
      lines.push(`   → Tous se connaissent : ${g.rows.map(r => r.name).join(', ')}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}
