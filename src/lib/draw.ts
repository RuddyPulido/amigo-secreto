import type { Assignments, Family, Person } from '../types'
import { cryptoRng32, randomInt, type Rng32 } from './rng'

export type FeasibilityCode =
  | 'NOT_ENOUGH_PEOPLE'
  | 'TOO_MANY_SAME_FAMILY'
  | 'AGE_GROUP_TOO_SMALL'
  | 'AGE_GROUP_FAMILY_TOO_LARGE'
  | 'NO_PERFECT_MATCHING'

export type Feasibility =
  | { ok: true }
  | { ok: false; code: FeasibilityCode; message: string; familyId?: string }

export type DrawOutcome =
  | { ok: true; targetId: string }
  | {
      ok: false
      code:
        | 'NOT_A_PARTICIPANT'
        | 'ALREADY_DRAWN'
        | 'NOT_FEASIBLE'
        | 'NO_VIABLE_TARGET'
      message: string
    }

export function isPairAllowed(
  drawer: Person,
  target: Person,
  allowSameFamily: boolean,
  onlyChildrenDrawChildren = false,
): boolean {
  return (
    drawer.id !== target.id &&
    (allowSameFamily || drawer.familyId !== target.familyId) &&
    (!onlyChildrenDrawChildren || drawer.isChild === target.isChild)
  )
}

export function buildAllowed(
  people: readonly Person[],
  allowSameFamily: boolean,
  onlyChildrenDrawChildren = false,
): Map<string, Set<string>> {
  const allowed = new Map<string, Set<string>>()
  for (const drawer of people) {
    const targets = new Set<string>()
    for (const target of people) {
      if (isPairAllowed(drawer, target, allowSameFamily, onlyChildrenDrawChildren)) {
        targets.add(target.id)
      }
    }
    allowed.set(drawer.id, targets)
  }
  return allowed
}

export function getRemainingDrawers(
  people: readonly Person[],
  assignments: Assignments,
): Person[] {
  return people.filter((person) => !Object.hasOwn(assignments, person.id))
}

export function getRemainingTargets(
  people: readonly Person[],
  assignments: Assignments,
): Person[] {
  const taken = new Set(Object.values(assignments))
  return people.filter((person) => !taken.has(person.id))
}

export function hasPerfectMatching(
  drawerIds: readonly string[],
  targetIds: readonly string[],
  allowed: ReadonlyMap<string, ReadonlySet<string>>,
): boolean {
  if (drawerIds.length !== targetIds.length) return false
  if (drawerIds.length === 0) return true

  const targetSet = new Set(targetIds)
  const ownerByTarget = new Map<string, string>()

  const augment = (drawerId: string, seen: Set<string>): boolean => {
    const targets = allowed.get(drawerId)
    if (!targets) return false

    for (const targetId of targets) {
      if (!targetSet.has(targetId) || seen.has(targetId)) continue
      seen.add(targetId)
      const owner = ownerByTarget.get(targetId)
      if (owner === undefined || augment(owner, seen)) {
        ownerByTarget.set(targetId, drawerId)
        return true
      }
    }
    return false
  }

  return drawerIds.every((drawerId) => augment(drawerId, new Set()))
}

function countByFamily(people: readonly Person[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const person of people) {
    counts.set(person.familyId, (counts.get(person.familyId) ?? 0) + 1)
  }
  return counts
}

function largestFamily(people: readonly Person[]): { familyId: string; count: number } {
  let familyId = ''
  let count = 0
  for (const [id, current] of countByFamily(people)) {
    if (current > count) {
      familyId = id
      count = current
    }
  }
  return { familyId, count }
}

function familyName(families: readonly Family[], familyId: string): string {
  return families.find((family) => family.id === familyId)?.name ?? 'Sem família'
}

export function validatePartialDraw(
  people: readonly Person[],
  allowSameFamily: boolean,
  assignments: Assignments,
  onlyChildrenDrawChildren = false,
): string[] {
  const issues: string[] = []
  const peopleById = new Map(people.map((person) => [person.id, person]))
  const usedTargets = new Set<string>()

  for (const [drawerId, targetId] of Object.entries(assignments)) {
    const drawer = peopleById.get(drawerId)
    const target = peopleById.get(targetId)
    if (!drawer) issues.push('A pessoa que sorteou não existe mais.')
    if (!target) issues.push('A pessoa sorteada não existe mais.')
    if (
      drawer &&
      target &&
      !isPairAllowed(drawer, target, allowSameFamily, onlyChildrenDrawChildren)
    ) {
      issues.push('Há um par inválido no sorteio.')
    }
    if (usedTargets.has(targetId)) {
      issues.push('A mesma pessoa foi sorteada mais de uma vez.')
    }
    usedTargets.add(targetId)
  }

  if (issues.length > 0) return issues

  const drawers = getRemainingDrawers(people, assignments)
  const targets = getRemainingTargets(people, assignments)
  if (drawers.length !== targets.length) {
    issues.push('O sorteio em andamento está inconsistente.')
    return issues
  }

  const allowed = buildAllowed(people, allowSameFamily, onlyChildrenDrawChildren)
  if (
    !hasPerfectMatching(
      drawers.map((person) => person.id),
      targets.map((person) => person.id),
      allowed,
    )
  ) {
    issues.push('O sorteio restante não pode ser concluído.')
  }

  return issues
}

export function validateCompleteDraw(
  people: readonly Person[],
  allowSameFamily: boolean,
  assignments: Assignments,
  onlyChildrenDrawChildren = false,
): string[] {
  const issues = validatePartialDraw(
    people,
    allowSameFamily,
    assignments,
    onlyChildrenDrawChildren,
  )
  if (issues.length > 0) return issues

  if (Object.keys(assignments).length !== people.length) {
    issues.push('O sorteio ainda não foi concluído.')
  } else if (getRemainingTargets(people, assignments).length !== 0) {
    issues.push('Nem todas as pessoas foram sorteadas.')
  }
  return issues
}

export function checkFeasibility(
  people: readonly Person[],
  families: readonly Family[],
  allowSameFamily: boolean,
  assignments: Assignments,
  onlyChildrenDrawChildren = false,
): Feasibility {
  const total = people.length
  if (total < 2) {
    return {
      ok: false,
      code: 'NOT_ENOUGH_PEOPLE',
      message: 'Cadastre pelo menos 2 pessoas para começar o sorteio.',
    }
  }

  if (onlyChildrenDrawChildren) {
    const groups = [
      {
        label: 'crianças',
        singular: 'criança',
        article: 'das',
        people: people.filter((person) => person.isChild),
      },
      {
        label: 'adultos',
        singular: 'adulto',
        article: 'dos',
        people: people.filter((person) => !person.isChild),
      },
    ]

    for (const group of groups) {
      if (group.people.length === 1) {
        return {
          ok: false,
          code: 'AGE_GROUP_TOO_SMALL',
          message: `Com a regra “Criança apenas sorteia criança” ligada, há apenas 1 ${group.singular} no grupo. Cadastre pelo menos 2 ${group.label} ou desligue a regra.`,
        }
      }

      if (!allowSameFamily && group.people.length >= 2) {
        const { familyId, count } = largestFamily(group.people)
        const limit = Math.floor(group.people.length / 2)
        if (count > limit) {
          return {
            ok: false,
            code: 'AGE_GROUP_FAMILY_TOO_LARGE',
            familyId,
            message: `A família “${familyName(families, familyId)}” tem ${count} de ${group.people.length} ${group.label}. Com o sorteio entre familiares desligado, nenhuma família pode ter mais da metade ${group.article} ${group.label} (${limit}). Ligue a opção de família ou ajuste as pessoas.`,
          }
        }
      }
    }
  } else if (!allowSameFamily) {
    const { familyId, count } = largestFamily(people)
    const limit = Math.floor(total / 2)
    if (count > limit) {
      return {
        ok: false,
        code: 'TOO_MANY_SAME_FAMILY',
        familyId,
        message: `A família “${familyName(families, familyId)}” tem ${count} de ${total} pessoas. Com o sorteio entre familiares desligado, nenhuma família pode ter mais da metade (${limit}). Ligue a opção nas configurações ou adicione pessoas de outras famílias.`,
      }
    }
  }

  if (
    validatePartialDraw(
      people,
      allowSameFamily,
      assignments,
      onlyChildrenDrawChildren,
    ).length > 0
  ) {
    const restrictions = onlyChildrenDrawChildren ? 'de família e idade' : 'de família'
    return {
      ok: false,
      code: 'NO_PERFECT_MATCHING',
      message: `Com as restrições atuais ${restrictions} não é possível concluir o sorteio. Ajuste os cadastros ou reinicie o sorteio.`,
    }
  }

  return { ok: true }
}

export function listViableTargets(
  people: readonly Person[],
  allowSameFamily: boolean,
  assignments: Assignments,
  drawerId: string,
  onlyChildrenDrawChildren = false,
): Person[] {
  const drawer = people.find((person) => person.id === drawerId)
  if (!drawer || Object.hasOwn(assignments, drawerId)) return []

  const drawers = getRemainingDrawers(people, assignments)
  const targets = getRemainingTargets(people, assignments)
  if (drawers.length !== targets.length || drawers.length === 0) return []

  const allowed = buildAllowed(people, allowSameFamily, onlyChildrenDrawChildren)
  if (
    !hasPerfectMatching(
      drawers.map((person) => person.id),
      targets.map((person) => person.id),
      allowed,
    )
  ) {
    return []
  }

  const remainingDrawers = drawers
    .filter((person) => person.id !== drawerId)
    .map((person) => person.id)

  return targets.filter((target) => {
    if (
      !isPairAllowed(drawer, target, allowSameFamily, onlyChildrenDrawChildren)
    ) {
      return false
    }
    const remainingTargets = targets
      .filter((person) => person.id !== target.id)
      .map((person) => person.id)
    return hasPerfectMatching(remainingDrawers, remainingTargets, allowed)
  })
}

export function drawForPerson(
  people: readonly Person[],
  allowSameFamily: boolean,
  assignments: Assignments,
  drawerId: string,
  rng: Rng32 = cryptoRng32,
  onlyChildrenDrawChildren = false,
): DrawOutcome {
  const drawer = people.find((person) => person.id === drawerId)
  if (!drawer) {
    return { ok: false, code: 'NOT_A_PARTICIPANT', message: 'Pessoa não encontrada.' }
  }
  if (Object.hasOwn(assignments, drawerId)) {
    return { ok: false, code: 'ALREADY_DRAWN', message: 'Essa pessoa já sorteou.' }
  }

  const drawers = getRemainingDrawers(people, assignments)
  const targets = getRemainingTargets(people, assignments)
  if (drawers.length !== targets.length || drawers.length === 0) {
    return {
      ok: false,
      code: 'NOT_FEASIBLE',
      message: 'O sorteio em andamento está inconsistente. Reinicie o sorteio.',
    }
  }

  const allowed = buildAllowed(people, allowSameFamily, onlyChildrenDrawChildren)
  if (
    !hasPerfectMatching(
      drawers.map((person) => person.id),
      targets.map((person) => person.id),
      allowed,
    )
  ) {
    return {
      ok: false,
      code: 'NOT_FEASIBLE',
      message: 'O sorteio em andamento não pode ser concluído. Reinicie o sorteio.',
    }
  }

  const viable = listViableTargets(
    people,
    allowSameFamily,
    assignments,
    drawerId,
    onlyChildrenDrawChildren,
  )
  if (viable.length === 0) {
    return {
      ok: false,
      code: 'NO_VIABLE_TARGET',
      message: 'Não foi possível sortear agora. Reinicie o sorteio.',
    }
  }

  const target = viable[randomInt(viable.length, rng)]!
  return { ok: true, targetId: target.id }
}
