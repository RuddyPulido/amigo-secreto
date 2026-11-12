import { useState, type FormEvent } from 'react'
import { Check, Pencil, Plus, Trash2, Users, X } from 'lucide-react'
import type { Family, Person } from '../../types'
import { newId } from '../../lib/ids'
import {
  normalizeName,
  validateFamilyChoice,
  validatePersonName,
} from '../../lib/validation'
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
import type { DispatchAction, RequestAction } from './types'

interface PeopleSectionProps {
  families: Family[]
  people: Person[]
  requestAction: RequestAction
  dispatch: DispatchAction
}

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export function PeopleSection({
  families,
  people,
  requestAction,
  dispatch,
}: PeopleSectionProps) {
  const [newName, setNewName] = useState('')
  const [newFamilyId, setNewFamilyId] = useState('')
  const [newError, setNewError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editFamilyId, setEditFamilyId] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)

  function handleAdd(event: FormEvent) {
    event.preventDefault()

    const nameError = validatePersonName(newName, people)
    if (nameError) {
      setNewError(nameError)
      return
    }
    const familyError = validateFamilyChoice(newFamilyId, families)
    if (familyError) {
      setNewError(familyError)
      return
    }

    setNewError(null)
    requestAction(
      {
        type: 'person/add',
        person: {
          id: newId(),
          name: normalizeName(newName),
          familyId: newFamilyId,
        },
      },
      () => {
        setNewName('')
        setNewFamilyId('')
      },
    )
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditName(person.name)
    setEditFamilyId(person.familyId)
    setEditError(null)
  }

  function handleSave(event: FormEvent, person: Person) {
    event.preventDefault()

    const nameError = validatePersonName(editName, people, person.id)
    if (nameError) {
      setEditError(nameError)
      return
    }
    const familyError = validateFamilyChoice(editFamilyId, families)
    if (familyError) {
      setEditError(familyError)
      return
    }

    setEditError(null)
    requestAction(
      {
        type: 'person/update',
        id: person.id,
        name: normalizeName(editName),
        familyId: editFamilyId,
      },
      () => setEditingId(null),
    )
  }

  function confirmDelete() {
    if (!deleteTarget) return
    dispatch({ type: 'person/remove', id: deleteTarget.id })
    if (editingId === deleteTarget.id) setEditingId(null)
    setDeleteTarget(null)
  }

  const groups = families
    .map((family) => ({
      family,
      members: people
        .filter((person) => person.familyId === family.id)
        .sort((a, b) => nameCollator.compare(a.name, b.name)),
    }))
    .filter((group) => group.members.length > 0)

  return (
    <section className={cardClass}>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-forest" aria-hidden="true" />
        <h2 className={sectionTitleClass}>Pessoas</h2>
        <span className="ml-auto text-xs font-medium tabular-nums text-ink/40">
          {people.length}
        </span>
      </div>

      {families.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-forest/15 p-3 text-sm leading-relaxed text-ink/50">
          Cadastre uma família antes de adicionar pessoas.
        </p>
      ) : (
        <>
          <form onSubmit={handleAdd} className="mt-4 space-y-3">
            <div>
              <label htmlFor="person-name" className={labelClass}>
                Nome da pessoa
              </label>
              <input
                id="person-name"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value)
                  setNewError(null)
                }}
                placeholder="Ex.: Ana"
                autoComplete="off"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="person-family" className={labelClass}>
                Família
              </label>
              <select
                id="person-family"
                value={newFamilyId}
                onChange={(event) => {
                  setNewFamilyId(event.target.value)
                  setNewError(null)
                }}
                className={inputClass}
              >
                <option value="">Selecione uma família</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name}
                  </option>
                ))}
              </select>
            </div>

            {newError ? (
              <p role="alert" className="text-sm text-berry">
                {newError}
              </p>
            ) : null}

            <button type="submit" className={`${primaryButtonClass} w-full`}>
              <Plus className="h-5 w-5" aria-hidden="true" />
              Adicionar pessoa
            </button>
          </form>

          {groups.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-forest/15 p-3 text-sm text-ink/50">
              Nenhuma pessoa cadastrada ainda.
            </p>
          ) : (
            <div className="mt-5 space-y-4">
              {groups.map(({ family, members }) => (
                <div key={family.id}>
                  <p className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink/45">
                    {family.name}
                  </p>
                  <ul className="mt-1.5 divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10">
                    {members.map((person) => (
                      <li key={person.id} className="px-3 py-2.5">
                        {editingId === person.id ? (
                          <form
                            onSubmit={(event) => handleSave(event, person)}
                            className="space-y-2"
                          >
                            <label
                              htmlFor={`person-edit-${person.id}`}
                              className="sr-only"
                            >
                              Novo nome de {person.name}
                            </label>
                            <input
                              id={`person-edit-${person.id}`}
                              value={editName}
                              onChange={(event) => {
                                setEditName(event.target.value)
                                setEditError(null)
                              }}
                              autoFocus
                              className={inputClass}
                            />
                            <label
                              htmlFor={`person-edit-family-${person.id}`}
                              className="sr-only"
                            >
                              Família de {person.name}
                            </label>
                            <select
                              id={`person-edit-family-${person.id}`}
                              value={editFamilyId}
                              onChange={(event) => {
                                setEditFamilyId(event.target.value)
                                setEditError(null)
                              }}
                              className={inputClass}
                            >
                              {families.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            {editError ? (
                              <p role="alert" className="text-sm text-berry">
                                {editError}
                              </p>
                            ) : null}
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className={smallPrimaryButtonClass}
                              >
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
                            <p className="min-w-0 flex-1 truncate font-medium text-ink">
                              {person.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => startEdit(person)}
                              aria-label={`Editar ${person.name}`}
                              className={iconButtonClass}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(person)}
                              aria-label={`Excluir ${person.name}`}
                              className={iconButtonClass}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir pessoa?"
        description={
          deleteTarget
            ? `Excluir “${deleteTarget.name}”? Se houver um sorteio em andamento, ele será reiniciado.`
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
