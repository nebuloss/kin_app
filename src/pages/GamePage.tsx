import { useMemo, useState, type ReactNode } from 'react'
import {
  Shuffle, RefreshCw, Crown, Eye, EyeOff, Users, Minus, Plus, PlusCircle, Check, RotateCcw, Trash2, Copy,
} from 'lucide-react'
import { cn, copyText } from '@/lib/utils'
import { COLORS } from '@/lib/colors'
import { useMembers, useGame } from '@/store/config'
import {
  planSizes, resolveGame, formatGameText, ruleDef, RULES, MAX_TEAMS, MIN_TEAM_SIZE, MAX_TEAM_SIZE,
  type PlayerCard, type GroupView, type TeamConfig, type RuleKind,
} from '@/core/game'
import RevealOverlay from '@/components/RevealOverlay'
import ConfirmModal from '@/components/ConfirmModal'

export default function GamePage() {
  const { members } = useMembers()
  const {
    config, setEmperor, updateTeam, toggleRest, addTeam, removeTeam,
    game, generate, clearGame, seen, markSeen, resetSeen,
  } = useGame()

  const [revealCard, setRevealCard] = useState<PlayerCard | null>(null)
  const [showMaster, setShowMaster] = useState(false)
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [copied, setCopied] = useState(false)

  const plan = useMemo(() => planSizes(members.length, config), [members.length, config])
  const resolved = useMemo(() => (game ? resolveGame(game, members) : null), [game, members])

  const orderedCards = useMemo(() => {
    if (!resolved) return []
    const order = new Map(members.map((m, i) => [m.id, i]))
    return [...resolved.cards].sort((a, b) => (order.get(a.memberId) ?? 1e9) - (order.get(b.memberId) ?? 1e9))
  }, [resolved, members])

  const rosterChanged = useMemo(() => {
    if (!resolved) return false
    const now = new Set(members.map(m => m.id))
    const inGame = new Set(resolved.cards.map(c => c.memberId))
    if (now.size !== inGame.size) return true
    for (const id of inGame) if (!now.has(id)) return true
    return false
  }, [resolved, members])

  const doGenerate = () => { generate(members, config); setShowMaster(false) }
  const onDistribute = () => { if (game) setConfirmRegen(true); else doGenerate() }

  const handleCopy = async () => {
    if (!resolved) return
    if (await copyText(formatGameText(resolved))) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const seenCount = orderedCards.filter(c => seen.has(c.memberId)).length

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 md:pb-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Répartition des rôles</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Équipes, tailles et règles de connaissance</p>
      </div>

      {/* ── Configuration ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-4 space-y-4">
        <label className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Crown size={17} className="text-yellow-500" /> Empereur neutre (Le Ciel)
          </span>
          <Switch checked={config.emperor} onChange={setEmperor} />
        </label>

        <div className="space-y-2.5">
          {config.teams.map(team => (
            <TeamEditor
              key={team.id}
              team={team}
              canRemove={config.teams.length > 1}
              onChange={patch => updateTeam(team.id, patch)}
              onToggleRest={on => toggleRest(team.id, on)}
              onRemove={() => removeTeam(team.id)}
            />
          ))}
        </div>

        {config.teams.length < MAX_TEAMS && (
          <button
            onClick={addTeam}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <PlusCircle size={17} /> Ajouter une équipe
          </button>
        )}

        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
          {plan.ok ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {plan.emperor && <Chip>👑 1</Chip>}
              {plan.plans.map(p => <Chip key={p.team.id}>{p.team.emoji} {p.size}</Chip>)}
              <span className="ml-auto text-slate-400 dark:text-slate-500">{plan.allocated}/{members.length} joueurs</span>
            </div>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">{plan.error}</p>
          )}
        </div>

        <button
          onClick={onDistribute}
          disabled={!plan.ok}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          {game ? <RefreshCw size={19} /> : <Shuffle size={19} />}
          {game ? 'Régénérer' : 'Répartir les rôles'}
        </button>
        {members.length === 0 && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Ajoute d’abord des joueurs dans l’onglet <b>Joueurs</b>.
          </p>
        )}
      </div>

      {/* ── Reveal + master view ── */}
      {resolved && (
        <>
          {rosterChanged && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
              La liste des joueurs a changé depuis cette répartition. Clique sur <b>Régénérer</b> pour l’appliquer.
            </div>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                <Eye size={18} /> Passe le téléphone
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400 tabular-nums">{seenCount}/{orderedCards.length} vus</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chacun tape son nom pour découvrir son rôle en privé, puis passe le téléphone.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {orderedCards.map(card => {
                const isSeen = seen.has(card.memberId)
                const c = COLORS[card.color]
                return (
                  <button
                    key={card.memberId}
                    onClick={() => setRevealCard(card)}
                    className={cn(
                      'relative flex items-center gap-2 rounded-xl border px-3 py-3 text-left transition-colors',
                      isSeen
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-emerald-400',
                    )}
                  >
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', isSeen ? 'bg-slate-300 dark:bg-slate-600' : c.dot)} />
                    <span className="truncate text-sm font-medium">{card.name}</span>
                    {isSeen && <Check size={15} className="ml-auto shrink-0 text-emerald-500" />}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {seenCount > 0 && (
                <button onClick={resetSeen}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400">
                  <RotateCcw size={15} /> Recommencer les révélations
                </button>
              )}
              <button onClick={() => setShowMaster(s => !s)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400">
                {showMaster ? <EyeOff size={15} /> : <Eye size={15} />}
                {showMaster ? 'Masquer la vue meneur' : 'Vue meneur (révèle tout)'}
              </button>
              <button onClick={handleCopy}
                className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  copied ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400')}>
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copié !' : 'Copier la répartition'}
              </button>
              <button onClick={clearGame}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-red-500 hover:border-red-400">
                <Trash2 size={15} /> Effacer la partie
              </button>
            </div>

            {seenCount === orderedCards.length && orderedCards.length > 0 && (
              <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Tout le monde a vu son rôle. Que la partie commence ! ⚔️
              </p>
            )}
          </section>

          {showMaster && (
            <section className="space-y-3">
              {resolved.groups.map((g, i) => <GroupCard key={i} group={g} />)}
            </section>
          )}
        </>
      )}

      {revealCard && (
        <RevealOverlay
          card={revealCard}
          onDone={() => { markSeen(revealCard.memberId); setRevealCard(null) }}
          onCancel={() => setRevealCard(null)}
        />
      )}

      {confirmRegen && (
        <ConfirmModal
          title="Régénérer la répartition ?"
          message="Une nouvelle répartition aléatoire remplacera l’actuelle."
          confirmLabel="Régénérer"
          onConfirm={() => { doGenerate(); setConfirmRegen(false) }}
          onCancel={() => setConfirmRegen(false)}
        />
      )}
    </div>
  )
}

// ── Reusable bits ─────────────────────────────────────────────────────────────

function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors',
        checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
    >
      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Diminuer"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-emerald-400">
        <Minus size={15} />
      </button>
      <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Augmenter"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-emerald-400">
        <Plus size={15} />
      </button>
    </div>
  )
}

function TeamEditor({ team, canRemove, onChange, onToggleRest, onRemove }: {
  team: TeamConfig
  canRemove: boolean
  onChange: (patch: Partial<TeamConfig>) => void
  onToggleRest: (on: boolean) => void
  onRemove: () => void
}) {
  const c = COLORS[team.color]
  return (
    <div className={cn('rounded-xl border p-3 space-y-2.5', c.border, c.softBg)}>
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">{team.emoji}</span>
        <input
          value={team.name}
          onChange={e => onChange({ name: e.target.value })}
          aria-label="Nom de l’équipe"
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none"
        />
        <button onClick={onRemove} disabled={!canRemove} aria-label="Retirer l’équipe"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-30 transition-colors">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
          <Switch checked={team.rest} onChange={onToggleRest} /> Reste
        </label>
        {team.rest
          ? <span className="text-xs text-slate-400 dark:text-slate-500">prend les joueurs restants</span>
          : <Stepper value={team.size} min={MIN_TEAM_SIZE} max={MAX_TEAM_SIZE} onChange={v => onChange({ size: v })} />}
      </div>

      <div>
        <select
          value={team.rule}
          onChange={e => onChange({ rule: e.target.value as RuleKind })}
          aria-label="Règle de connaissance"
          className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-400"
        >
          {RULES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <p className="mt-1 text-[11px] leading-snug text-slate-400 dark:text-slate-500">{ruleDef(team.rule).desc}</p>
      </div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 font-medium text-slate-700 dark:text-slate-200">
      {children}
    </span>
  )
}

function GroupCard({ group }: { group: GroupView }) {
  const c = COLORS[group.color]
  return (
    <div className={cn('rounded-2xl border p-4', c.border, c.softBg)}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{group.emoji}</span>
        <h3 className={cn('font-bold', c.text)}>{group.name}</h3>
        {group.hanzi && <span className={cn('text-sm font-semibold opacity-70', c.text)}>{group.hanzi}</span>}
        <span className="ml-auto rounded-md bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {ruleDef(group.rule).short}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {group.rows.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">
              {r.isChief ? <Crown size={15} className="text-yellow-500" /> : <Users size={14} className="text-slate-400" />}
            </span>
            <span className="text-slate-800 dark:text-slate-100 font-medium">{r.name}</span>
            <span className="text-slate-500 dark:text-slate-400">— {r.knowsLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
