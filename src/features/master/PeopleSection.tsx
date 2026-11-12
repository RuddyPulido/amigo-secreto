import { useState, type FormEvent } from 'react'
import { Check, Pencil, Phone, Plus, Trash2, Users, X } from 'lucide-react'
import type { Db } from '../../data/db'
import type { Credential, Family, Id, Person } from '../../types'
import { newId } from '../../lib/ids'
import { formatPhone, validatePhone } from '../../lib/phone'
import {
  normalizeName,
  validateFamilyChoice,
  validatePersonName,
} from '../../lib/validation'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Switch } from '../../components/Switch'
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
import { InviteActions } from './InviteActions'
import { AccountChips } from './StatusChip'

interface PeopleSectionProps {
  db: Db
  families: Family[]
  people: Person[]
  credentials: Record<Id, Credential>
  requestAction: RequestAction
  dispatch: DispatchAction
}

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export function PeopleSection({
  db,
  families,
  people,
  credentials,
  requestAction,
  dispatch,
}: PeopleSectionProps) {
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newFamilyId, setNewFamilyId] = useState('')
  const [newIsChild, setNewIsChild] = useState(false)
  const [newError, setNewError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editFamilyId, setEditFamilyId] = useState('')
  const [editIsChild, setEditIsChild] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null)

  function handleAdd(event: FormEvent) {
    event.preventDefault()

    const nameError = validatePersonName(newName, people)
    if (nameError) return setNewError(nameError)
    const phoneError = validatePhone(newPhone)
    if (phoneError) return setNewError(phoneError)
    const familyError = validateFamilyChoice(newFamilyId, families)
    if (familyError) return setNewError(familyError)

    setNewError(null)
    const submitted = {
      name: newName,
      phone: newPhone,
      familyId: newFamilyId,
      isChild: newIsChild,
    }
    requestAction(
      {
        type: 'person/add',
        person: {
          id: newId(),
          name: normalizeName(newName),
          familyId: newFamilyId,
          isChild: newIsChild,
        },
        phone: newPhone,
      },
      // Limpa só os campos que ainda têm o valor enviado (a pessoa pode já estar digitando outro).
      () => {
        setNewName((current) => (current === submitted.name ? '' : current))
        setNewPhone((current) => (current === submitted.phone ? '' : current))
        setNewFamilyId((current) => (current === submitted.familyId ? '' : current))
        setNewIsChild((current) => (current === submitted.isChild ? false : current))
      },
    )
  }

  function startEdit(person: Person) {
    setEditingId(person.id)
    setEditName(person.name)
    setEditPhone(formatPhone(credentials[person.id]?.phone ?? ''))
    setEditFamilyId(person.familyId)
    setEditIsChild(person.isChild)
    setEditError(null)
  }

  function handleSave(event: FormEvent, person: Person) {
    event.preventDefault()

    const nameError = validatePersonName(editName, people, person.id)
    if (nameError) return setEditError(nameError)
    const phoneError = validatePhone(editPhone)
    if (phoneError) return setEditError(phoneError)
    const familyError = validateFamilyChoice(editFamilyId, families)
    if (familyError) return setEditError(familyError)

    setEditError(null)
    requestAction(
      {
        type: 'person/update',
        id: person.id,
        name: normalizeName(editName),
        familyId: editFamilyId,
        isChild: editIsChild,
        phone: editPhone,
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
              <label htmlFor="person-phone" className={labelClass}>
                WhatsApp (com DDD)
              </label>
              <input
                id="person-phone"
                value={newPhone}
                onChange={(event) => {
                  setNewPhone(event.target.value)
                  setNewError(null)
                }}
                type="tel"
                inputMode="tel"
                placeholder="(11) 91234-5678"
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

            <div className="rounded-2xl border border-forest/10 p-3">
              <Switch
                checked={newIsChild}
                onChange={setNewIsChild}
                label="É criança"
                description="Só entra no sorteio de crianças quando a opção estiver ligada nas regras."
              />
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
                    {members.map((person) => {
                      const credential = credentials[person.id]

                      return (
                        <li key={person.id} className="px-3 py-2.5">
                          {editingId === person.id ? (
                            <form
                              onSubmit={(event) => handleSave(event, person)}
                              className="space-y-2"
                            >
                              <label htmlFor={`person-edit-${person.id}`} className="sr-only">
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
                              <label htmlFor={`person-edit-phone-${person.id}`} className="sr-only">
                                WhatsApp de {person.name}
                              </label>
                              <input
                                id={`person-edit-phone-${person.id}`}
                                value={editPhone}
                                onChange={(event) => {
                                  setEditPhone(event.target.value)
                                  setEditError(null)
                                }}
                                type="tel"
                                inputMode="tel"
                                className={inputClass}
                              />
                              <label htmlFor={`person-edit-family-${person.id}`} className="sr-only">
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
                              <div className="rounded-2xl border border-forest/10 p-3">
                                <Switch
                                  checked={editIsChild}
                                  onChange={setEditIsChild}
                                  label="É criança"
                                  description="Só entra no sorteio de crianças quando a opção estiver ligada nas regras."
                                />
                              </div>
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
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <p className="min-w-0 truncate font-medium text-ink">
                                    {person.name}
                                  </p>
                                  {person.isChild ? (
                                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/70">
                                      Criança
                                    </span>
                                  ) : null}
                                </div>
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
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs text-ink/55">
                                  <Phone className="h-3 w-3" aria-hidden="true" />
                                  {credential ? formatPhone(credential.phone) : '—'}
                                </span>
                                <AccountChips credential={credential} />
                              </div>
                              <InviteActions db={db} person={person} credential={credential} />
                            </div>
                          )}
                        </li>
                      )
                    })}
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
            ? `Excluir “${deleteTarget.name}”? O acesso dessa pessoa será removido e, se houver um sorteio em andamento, ele será reiniciado.`
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
