import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import type { Family, Person } from '../../types'
import { newId } from '../../lib/ids'
import { normalizeName, validateFamilyName } from '../../lib/validation'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import {
  cardClass,
  iconButtonClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  sectionTitleClass,
  smallPrimaryButtonClass,
  smallSecondaryButtonClass,
} from '../../components/ui'
import type { DispatchAction, RequestAction } from './controller'

interface FamiliesSectionProps {
  families: Family[]
  people: Person[]
  requestAction: RequestAction
  dispatch: DispatchAction
}

export function FamiliesSection({
  families,
  people,
  requestAction,
  dispatch,
}: FamiliesSectionProps) {
  const [newName, setNewName] = useState('')
  const [newError, setNewError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [rowError, setRowError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Family | null>(null)

  function memberCount(familyId: string): number {
    return people.filter((person) => person.familyId === familyId).length
  }

  function handleAdd(event: FormEvent) {
    event.preventDefault()
    const error = validateFamilyName(newName, families)
    if (error) {
      setNewError(error)
      return
    }

    setNewError(null)
    setRowError(null)
    const submitted = newName
    requestAction(
      {
        type: 'family/add',
        family: { id: newId(), name: normalizeName(newName) },
      },
      // Só limpa se a pessoa ainda não começou a digitar o próximo nome.
      () => setNewName((current) => (current === submitted ? '' : current)),
    )
  }

  function startEdit(family: Family) {
    setEditingId(family.id)
    setEditName(family.name)
    setEditError(null)
    setRowError(null)
  }

  function handleRename(event: FormEvent, family: Family) {
    event.preventDefault()
    const error = validateFamilyName(editName, families, family.id)
    if (error) {
      setEditError(error)
      return
    }

    setEditError(null)
    requestAction(
      {
        type: 'family/rename',
        id: family.id,
        name: normalizeName(editName),
      },
      () => setEditingId(null),
    )
  }

  function handleDeleteClick(family: Family) {
    const count = memberCount(family.id)
    if (count > 0) {
      setRowError(
        `A família “${family.name}” tem ${count} ${
          count === 1 ? 'pessoa' : 'pessoas'
        }. Exclua ou mova essas pessoas antes de excluir a família.`,
      )
      return
    }

    setRowError(null)
    setDeleteTarget(family)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'family/remove', id: deleteTarget.id })
    if (editingId === deleteTarget.id) setEditingId(null)
    setRowError(null)
    setDeleteTarget(null)
  }

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-forest" aria-hidden="true" />
        <h2 className={sectionTitleClass}>Famílias</h2>
        <span className="ml-auto text-xs font-medium tabular-nums text-ink/40">
          {families.length}
        </span>
      </div>

      <form onSubmit={handleAdd} className="mt-4 space-y-2">
        <label htmlFor="family-name" className={labelClass}>
          Nome da família
        </label>
        <input
          id="family-name"
          value={newName}
          onChange={(event) => {
            setNewName(event.target.value)
            setNewError(null)
          }}
          placeholder="Ex.: Silva"
          autoComplete="off"
          className={inputClass}
        />
        {newError ? (
          <p role="alert" className="text-sm text-berry">
            {newError}
          </p>
        ) : null}
        <button type="submit" className={`${primaryButtonClass} w-full`}>
          <Plus className="h-5 w-5" aria-hidden="true" />
          Adicionar família
        </button>
      </form>

      {rowError ? (
        <p role="alert" className="mt-3 text-sm leading-relaxed text-berry">
          {rowError}
        </p>
      ) : null}

      {families.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-forest/15 p-3 text-sm text-ink/50">
          Nenhuma família cadastrada ainda.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10">
          {families.map((family) => {
            const count = memberCount(family.id)

            return (
              <li key={family.id} className="px-3 py-2.5">
                {editingId === family.id ? (
                  <form
                    onSubmit={(event) => handleRename(event, family)}
                    className="space-y-2"
                  >
                    <label htmlFor={`family-edit-${family.id}`} className="sr-only">
                      Novo nome da família {family.name}
                    </label>
                    <input
                      id={`family-edit-${family.id}`}
                      value={editName}
                      onChange={(event) => {
                        setEditName(event.target.value)
                        setEditError(null)
                      }}
                      autoFocus
                      className={inputClass}
                    />
                    {editError ? (
                      <p role="alert" className="text-sm text-berry">
                        {editError}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <button type="submit" className={smallPrimaryButtonClass}>
                        <Check className="h-4 w-4" aria-hidden="true" />
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={smallSecondaryButtonClass}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{family.name}</p>
                      <p className="text-xs text-ink/50">
                        {count} {count === 1 ? 'pessoa' : 'pessoas'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(family)}
                      aria-label={`Renomear ${family.name}`}
                      className={iconButtonClass}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(family)}
                      aria-label={`Excluir ${family.name}`}
                      className={iconButtonClass}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir família?"
        description={
          deleteTarget
            ? `A família “${deleteTarget.name}” será removida.`
            : ''
        }
        confirmLabel="Excluir"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
