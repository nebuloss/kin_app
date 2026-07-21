import { useMemo, useState, type ReactNode } from 'react'
import {
  Shuffle, RefreshCw, Crown, ShieldAlert, Eye, EyeOff, Users, Minus, Plus, Check, RotateCcw, Trash2, Copy,
} from 'lucide-react'
import { cn, copyText } from '@/lib/utils'
import { COLORS } from '@/lib/colors'
import { useMembers, useGame } from '@/store/config'
import {
  planSizes, resolveGame, formatGameText, KINGDOM_DEFS, MAX_KINGDOMS,
  type PlayerCard, type GroupView,
} from '@/core/game'
import RevealOverlay from '@/components/RevealOverlay'
import ConfirmModal from '@/components/ConfirmModal'

export default function GamePage() {
  const { members } = useMembers()
  const { config, setConfig, game, generate, clearGame, seen, markSeen, resetSeen } = useGame()

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

  // Did the roster change since this game was rolled?
  const rosterChanged = useMemo(() => {
    if (!resolved) return false
    const now = new Set(members.map(m => m.id))
    const inGame = new Set(resolved.cards.map(c => c.memberId))
    if (now.size !== inGame.size) return true
    for (const id of inGame) if (!now.has(id)) return true
    return false
  }, [resolved, members])

  const doGenerate = () => {
    generate(members, config)
    setShowMaster(false)
  }
  const onDistribute = () => {
    if (game) setConfirmRegen(true)
    else doGenerate()
  }

  const handleCopy = async () => {
    if (!resolved) return
    const ok = await copyText(formatGameText(resolved))
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const seenCount = orderedCards.filter(c => seen.has(c.memberId)).length
  const kingdomEmojis = KINGDOM_DEFS.slice(0, config.kingdomCount).map(d => d.emoji).join('')

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 md:pb-8 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Royaumes combattants</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Chine antique · répartition secrète des rôles</p>
      </div>

      {/* ── Configuration ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 p-4 space-y-4">
        {/* Emperor toggle */}
        <label className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            <Crown size={17} className="text-yellow-500" /> Empereur neutre (Le Ciel)
          </span>
          <button
            role="switch"
            aria-checked={config.includeEmperor}
            onClick={() => setConfig({ includeEmperor: !config.includeEmperor })}
            className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors',
              config.includeEmperor ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600')}
          >
            <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
              config.includeEmperor ? 'left-6' : 'left-1')} />
          </button>
        </label>

        {/* Kingdom count stepper */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Nombre de royaumes <span className="ml-1 text-lg">{kingdomEmojis}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setConfig({ kingdomCount: config.kingdomCount - 1 })}
              disabled={config.kingdomCount <= 1}
              aria-label="Moins de royaumes"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-emerald-400"
            >
              <Minus size={16} />
            </button>
            <span className="w-5 text-center text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">{config.kingdomCount}</span>
            <button
              onClick={() => setConfig({ kingdomCount: config.kingdomCount + 1 })}
              disabled={config.kingdomCount >= MAX_KINGDOMS}
              aria-label="Plus de royaumes"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:border-emerald-400"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Size preview / validation */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
          {plan.ok ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {plan.emperor && <Chip>👑 1</Chip>}
              {plan.kingdomSizes.map((s, i) => (
                <Chip key={i}>{KINGDOM_DEFS[i].emoji} {s}</Chip>
              ))}
              <Chip>⚔️ {plan.qinSize}</Chip>
              <span className="ml-auto text-slate-400 dark:text-slate-500">{members.length} joueurs</span>
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
                <button
                  onClick={resetSeen}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400"
                >
                  <RotateCcw size={15} /> Recommencer les révélations
                </button>
              )}
              <button
                onClick={() => setShowMaster(s => !s)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400"
              >
                {showMaster ? <EyeOff size={15} /> : <Eye size={15} />}
                {showMaster ? 'Masquer la vue meneur' : 'Vue meneur (révèle tout)'}
              </button>
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  copied
                    ? 'border-emerald-400 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400',
                )}
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copié !' : 'Copier la répartition'}
              </button>
              <button
                onClick={clearGame}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-red-500 hover:border-red-400"
              >
                <Trash2 size={15} /> Effacer la partie
              </button>
            </div>

            {seenCount === orderedCards.length && orderedCards.length > 0 && (
              <p className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Tout le monde a vu son rôle. Que la guerre commence ! ⚔️
              </p>
            )}
          </section>

          {/* Master view */}
          {showMaster && (
            <section className="space-y-3">
              {resolved.groups.map((g, i) => (
                <GroupCard key={i} group={g} />
              ))}
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 font-medium text-slate-700 dark:text-slate-200">
      {children}
    </span>
  )
}

function GroupCard({ group }: { group: GroupView }) {
  const c = COLORS[group.color]
  const isQin = group.kind === 'qin'
  return (
    <div className={cn('rounded-2xl border p-4', c.border, c.softBg)}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{group.emoji}</span>
        <h3 className={cn('font-bold', c.text)}>{group.name}</h3>
        <span className={cn('text-sm font-semibold opacity-70', c.text)}>{group.hanzi}</span>
        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">{group.rows.length} joueur{group.rows.length > 1 ? 's' : ''}</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {group.rows.map((r, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5">
              {r.isChief ? <Crown size={15} className="text-yellow-500" /> : isQin ? <ShieldAlert size={14} className="text-slate-500" /> : <Users size={14} className="text-slate-400" />}
            </span>
            <span className="text-slate-800 dark:text-slate-100 font-medium">{r.name}</span>
            <span className="text-slate-500 dark:text-slate-400">— {r.knowsLabel}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
