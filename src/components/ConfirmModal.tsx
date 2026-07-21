import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Small centred confirmation dialog. Esc cancels; tap the backdrop cancels. */
export default function ConfirmModal({
  title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger, onConfirm, onCancel,
}: Props) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          {message && <div className="text-sm text-slate-500 dark:text-slate-400">{message}</div>}
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
