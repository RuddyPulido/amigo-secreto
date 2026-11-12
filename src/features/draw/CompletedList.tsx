import { CheckCircle2, Eye } from 'lucide-react'
import type { Assignments, Family, Person } from '../../types'
import {
  iconButtonClass,
  sectionKickerClass,
} from '../../components/ui'

interface CompletedListProps {
  people: Person[]
  families: Family[]
  assignments: Assignments
  onReveal: (person: Person) => void
}

const nameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

export function CompletedList({
  people,
  families,
  assignments,
  onReveal,
}: CompletedListProps) {
  const familyNameById = new Map(
    families.map((family) => [family.id, family.name]),
  )
  const completed = people
    .filter((person) => Object.hasOwn(assignments, person.id))
    .sort((a, b) => nameCollator.compare(a.name, b.name))

  if (completed.length === 0) return null

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 className={sectionKickerClass}>Quem já sorteou</h2>
        <span className="text-xs font-medium tabular-nums text-ink/40">
          {completed.length}
        </span>
      </div>
      <ul className="mt-2 divide-y divide-forest/10 overflow-hidden rounded-2xl border border-forest/10 bg-paper">
        {completed.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-3 py-2.5">
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-forest"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">{person.name}</p>
              <p className="truncate text-xs text-ink/50">
                {familyNameById.get(person.familyId) ?? 'Sem família'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onReveal(person)}
              aria-label={`Ver resultado de ${person.name}`}
              className={iconButtonClass}
            >
              <Eye className="h-5 w-5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
