import { useMemo, useRef, useState } from 'react'
import {
  Plus, Trash2, ClipboardList, Check, X, CheckCircle2, Circle, Pencil, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseNames } from '@/lib/parseNames'
import { useMembers } from '@/store/config'
import ConfirmModal from '@/components/ConfirmModal'

export default function PlayersPage() {
  const { members, addMember, addNames, removeMember, renameMember, clearMembers } = useMembers()

  const [newName, setNewName] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const addInputRef = useRef<HTMLInputElement>(null)

  const parsed = useMemo(() => parseNames(importText), [importText])
  const selectedCount = selected.size
  const allSelected = members.length > 0 && selectedCount === members.length

  const handleAdd = () => {
    const name = newName.trim()
    if (!name) return
    addMember(name)
    setNewName('')
    addInputRef.current?.focus()
  }

  const handleImport = () => {
    if (!parsed.length) return
    addNames(parsed)
    setImportText('')
    setImportOpen(false)
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(members.map(m => m.id)))
  }

  const deleteSelected = () => {
    selected.forEach(id => removeMember(id))
    setSelected(new Set())
    setConfirmBulk(false)
  }

  const startEdit = (id: string, name: string) => { setEditingId(id); setEditValue(name) }
  const commitEdit = () => {
    if (editingId) renameMember(editingId, editValue)
    setEditingId(null)
    setEditValue('')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-28 md:pb-8 space-y-5">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Joueurs</h1>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {members.length} {members.length > 1 ? 'joueurs' : 'joueur'}
        </span>
      </div>

      {/* Add one */}
      <div className="flex gap-2">
        <input
          ref={addInputRef}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Ajouter un joueur…"
          autoComplete="off"
          enterKeyHint="done"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          aria-label="Ajouter"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* Import from paste */}
      {!importOpen ? (
        <button
          onClick={() => setImportOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ClipboardList size={17} />
          Coller une liste (import)
        </button>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Coller une liste</p>
            <button onClick={() => { setImportOpen(false); setImportText('') }} aria-label="Fermer"
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X size={18} />
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Un nom par ligne. Les puces (•, -, 1.), numéros de téléphone et espaces superflus sont nettoyés automatiquement.
          </p>
          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            rows={6}
            autoFocus
            placeholder={'Alice\nBob\n- Charlie\n3. Dana\n…'}
            className="w-full resize-y rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleImport}
              disabled={!parsed.length}
              className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              {parsed.length ? `Ajouter ${parsed.length} joueur${parsed.length > 1 ? 's' : ''}` : 'Aucun nom détecté'}
            </button>
          </div>
        </div>
      )}

      {/* Selection action bar */}
      {members.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={toggleSelectAll}
            className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
          {selectedCount > 0 ? (
            <button
              onClick={() => setConfirmBulk(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 size={15} />
              Supprimer ({selectedCount})
            </button>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-sm font-medium text-red-500 hover:text-red-600"
            >
              Tout effacer
            </button>
          )}
        </div>
      )}

      {/* List / empty state */}
      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-14 text-center">
          <Users size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucun joueur pour l’instant.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">Ajoute des joueurs un par un ou colle une liste.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden">
          {members.map((m, i) => {
            const isSelected = selected.has(m.id)
            const isEditing = editingId === m.id
            return (
              <li key={m.id} className={cn('flex items-center gap-3 px-3 py-2.5', isSelected && 'bg-emerald-50 dark:bg-emerald-950/30')}>
                <button
                  onClick={() => toggleSelect(m.id)}
                  aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                  className="shrink-0 text-slate-300 dark:text-slate-600"
                >
                  {isSelected
                    ? <CheckCircle2 size={22} className="text-emerald-500" />
                    : <Circle size={22} className="hover:text-emerald-400" />}
                </button>

                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-400 dark:text-slate-500">{i + 1}</span>

                {isEditing ? (
                  <input
                    value={editValue}
                    autoFocus
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') { setEditingId(null); setEditValue('') }
                    }}
                    className="flex-1 rounded-lg border border-emerald-400 bg-white dark:bg-slate-900 px-2 py-1.5 text-base text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                ) : (
                  <button onClick={() => startEdit(m.id, m.name)} className="flex-1 min-w-0 text-left flex items-center gap-1.5 group">
                    <span className="truncate text-base text-slate-800 dark:text-slate-100">{m.name}</span>
                    <Pencil size={13} className="shrink-0 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {isEditing ? (
                  <button onClick={commitEdit} aria-label="Valider" className="shrink-0 rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                    <Check size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => removeMember(m.id)}
                    aria-label={`Supprimer ${m.name}`}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {confirmClear && (
        <ConfirmModal
          title="Tout effacer ?"
          message={`Les ${members.length} joueurs seront supprimés.`}
          confirmLabel="Tout effacer"
          danger
          onConfirm={() => { clearMembers(); setSelected(new Set()); setConfirmClear(false) }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      {confirmBulk && (
        <ConfirmModal
          title={`Supprimer ${selectedCount} joueur${selectedCount > 1 ? 's' : ''} ?`}
          confirmLabel="Supprimer"
          danger
          onConfirm={deleteSelected}
          onCancel={() => setConfirmBulk(false)}
        />
      )}
    </div>
  )
}
