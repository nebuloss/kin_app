import { useState } from 'react'
import { X, Eye, EyeOff, Crown, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COLORS } from '@/lib/colors'
import type { PlayerCard } from '@/core/game'

interface Props {
  card: PlayerCard
  /** Called when the player taps "J'ai vu" (mark them as done). */
  onDone: () => void
  /** Called when backing out without revealing (does not mark as done). */
  onCancel: () => void
}

/**
 * Full-screen private reveal. Two steps so nobody sees the previous card:
 *   1. a neutral hand-off screen naming who should hold the phone;
 *   2. the secret role card, shown only after an explicit tap.
 */
export default function RevealOverlay({ card, onDone, onCancel }: Props) {
  const [revealed, setRevealed] = useState(false)
  const c = COLORS[card.color]

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950 text-white flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-end p-3">
        <button onClick={onCancel} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:text-white">
          <X size={22} />
        </button>
      </div>

      {!revealed ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Lock size={28} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-widest text-slate-400">Passe le téléphone à</p>
            <p className="text-3xl font-bold">{card.name}</p>
          </div>
          <p className="max-w-xs text-sm text-slate-400">
            Personne d’autre ne doit regarder l’écran. Quand tu es prêt·e, révèle ton rôle.
          </p>
          <button
            onClick={() => setRevealed(true)}
            className="mt-2 flex items-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 text-base font-semibold hover:bg-emerald-500 transition-colors"
          >
            <Eye size={20} /> Révéler mon rôle
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-4 pb-4 overflow-auto">
          <div className={cn('rounded-3xl bg-gradient-to-br p-6 text-white shadow-2xl', c.gradient)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm/none opacity-80">{card.name}</p>
                <p className="mt-2 text-2xl font-extrabold leading-tight">{card.teamName}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl leading-none">{card.emoji}</div>
                {card.hanzi && <div className="mt-1 text-2xl font-bold opacity-90">{card.hanzi}</div>}
              </div>
            </div>

            {card.isChief && (
              <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold">
                <Crown size={15} /> CHEF
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 text-[15px]">
            <SecretBody card={card} />
          </div>

          <div className="flex-1" />

          <button
            onClick={onDone}
            className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-slate-100 py-4 text-base font-semibold text-slate-900 hover:bg-white transition-colors"
          >
            <EyeOff size={20} /> J’ai vu — cacher
          </button>
        </div>
      )}
    </div>
  )
}

function SecretBody({ card }: { card: PlayerCard }) {
  if (card.teamKind === 'emperor') {
    return (
      <>
        <p className="text-slate-200">Tu es <b>au-dessus des équipes</b>. Le Ciel veille.</p>
        <p className="text-slate-400">Tu ne connais personne. Certains, eux, te connaissent peut-être.</p>
      </>
    )
  }

  // Chief (chief-emperor rule)
  if (card.isChief) {
    return (
      <>
        <p className="text-slate-200">Tu es le <b>chef</b> de ton équipe.</p>
        {card.knowsEmperor
          ? <p className="text-slate-200">Tu connais l’Empereur : <b className="text-white">{card.knowsEmperor}</b>.</p>
          : <p className="text-slate-400">Il n’y a pas d’Empereur dans cette partie.</p>}
        <p className="text-slate-400">Tu ne connais <b>personne d’autre</b> dans ton équipe.</p>
      </>
    )
  }

  // "all" rule
  if (card.knowsAll) {
    return (
      <>
        <p className="text-slate-200">Dans ton équipe, <b>vous vous connaissez tous</b> :</p>
        {card.knowsAll.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {card.knowsAll.map((n, i) => (
              <span key={i} className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-white">{n}</span>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Tu es le seul membre de l’équipe.</p>
        )}
      </>
    )
  }

  // "emperor" rule (non-chief knows the emperor)
  if (card.knowsEmperor) {
    return <p className="text-slate-200">Tu connais l’Empereur : <b className="text-white text-lg">{card.knowsEmperor}</b>.</p>
  }

  // "random" / "loop" rule
  if (card.knowsName) {
    return (
      <>
        <p className="text-slate-200">Tu connais : <b className="text-white text-lg">{card.knowsName}</b></p>
        <p className="text-slate-500 text-sm">(cette personne est dans ton équipe — mais elle ne te connaît pas forcément.)</p>
      </>
    )
  }

  return <p className="text-slate-400">Tu ne connais personne.</p>
}
