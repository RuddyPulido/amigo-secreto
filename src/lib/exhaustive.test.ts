import { describe, expect, it } from 'vitest'
import type { Assignments, Family, Person } from '../types'
import {
  checkFeasibility,
  drawForPerson,
  validateCompleteDraw,
  validatePartialDraw,
} from './draw'
import { mulberry32 } from './rng'

function partitions(n: number): number[][] {
  const result: number[][] = []
  const current: number[] = []

  const visit = (index: number, maxLabel: number) => {
    if (index === n) {
      result.push([...current])
      return
    }
    for (let label = 0; label <= maxLabel + 1; label += 1) {
      current.push(label)
      visit(index + 1, Math.max(maxLabel, label))
      current.pop()
    }
  }

  visit(0, -1)
  return result
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]]

  const result: T[][] = []
  for (let index = 0; index < items.length; index += 1) {
    const rest = [...items.slice(0, index), ...items.slice(index + 1)]
    for (const permutation of permutations(rest)) {
      result.push([items[index]!, ...permutation])
    }
  }
  return result
}

function buildWorld(labels: readonly number[]): {
  families: Family[]
  people: Person[]
} {
  const familyCount = Math.max(...labels) + 1
  const families = Array.from({ length: familyCount }, (_, index) => ({
    id: `f${index}`,
    name: `Família ${index + 1}`,
  }))
  const people = labels.map((label, index) => ({
    id: `p${index}`,
    name: `Pessoa ${index + 1}`,
    familyId: `f${label}`,
    isChild: false,
  }))
  return { families, people }
}

function largestFamilySize(labels: readonly number[]): number {
  const counts = new Map<number, number>()
  for (const label of labels) {
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return Math.max(...counts.values())
}

describe('sorteio exaustivo', () => {
  for (const n of [2, 3, 4, 5]) {
    it(`n=${n}: todas as partições, todas as ordens e ambos os toggles`, () => {
      for (const labels of partitions(n)) {
        const { families, people } = buildWorld(labels)
        const orders = permutations(people.map((person) => person.id))
        const maxFamily = largestFamilySize(labels)

        for (const allowSameFamily of [false, true]) {
          const feasible = checkFeasibility(people, families, allowSameFamily, {})
          const expected = allowSameFamily || maxFamily <= Math.floor(n / 2)
          expect(feasible.ok, JSON.stringify(labels)).toBe(expected)
          if (!feasible.ok) continue

          for (const order of orders) {
            const assignments: Assignments = {}
            const rng = mulberry32(0x9e3779b9)

            for (const drawerId of order) {
              const outcome = drawForPerson(
                people,
                allowSameFamily,
                assignments,
                drawerId,
                rng,
              )
              expect(outcome.ok).toBe(true)
              if (!outcome.ok) throw new Error(outcome.message)

              const drawer = people.find((person) => person.id === drawerId)
              const target = people.find((person) => person.id === outcome.targetId)
              expect(target).toBeDefined()
              expect(outcome.targetId).not.toBe(drawerId)
              expect(Object.values(assignments)).not.toContain(outcome.targetId)
              if (!allowSameFamily) {
                expect(target?.familyId).not.toBe(drawer?.familyId)
              }

              assignments[drawerId] = outcome.targetId
              expect(validatePartialDraw(people, allowSameFamily, assignments)).toEqual([])
            }

            expect(validateCompleteDraw(people, allowSameFamily, assignments)).toEqual([])
            expect(Object.keys(assignments)).toHaveLength(n)
            expect(new Set(Object.values(assignments)).size).toBe(n)
          }
        }
      }
    })
  }
})

function largestFamilyCount(people: readonly Person[]): number {
  const counts = new Map<string, number>()
  for (const person of people) {
    counts.set(person.familyId, (counts.get(person.familyId) ?? 0) + 1)
  }
  return counts.size > 0 ? Math.max(...counts.values()) : 0
}

function expectedAgeFeasibility(
  people: readonly Person[],
  allowSameFamily: boolean,
  ageRule: boolean,
): boolean {
  if (people.length < 2) return false

  const groups = ageRule
    ? [
        people.filter((person) => person.isChild),
        people.filter((person) => !person.isChild),
      ]
    : [people]

  for (const group of groups) {
    if (group.length === 0) continue
    if (ageRule && group.length === 1) return false
    if (
      !allowSameFamily &&
      largestFamilyCount(group) > Math.floor(group.length / 2)
    ) {
      return false
    }
  }

  return true
}

describe('sorteio exaustivo com separação por idade', () => {
  for (const n of [2, 3, 4]) {
    it(`n=${n}: todas as famílias, idades e ordens`, () => {
      for (const labels of partitions(n)) {
        const { families, people } = buildWorld(labels)

        for (let mask = 0; mask < 1 << n; mask += 1) {
          const aged = people.map((person, index) => ({
            ...person,
            isChild: (mask & (1 << index)) !== 0,
          }))

          for (const allowSameFamily of [false, true]) {
            for (const ageRule of [false, true]) {
              const expected = expectedAgeFeasibility(
                aged,
                allowSameFamily,
                ageRule,
              )
              const feasibility = checkFeasibility(
                aged,
                families,
                allowSameFamily,
                {},
                ageRule,
              )
              expect(
                feasibility.ok,
                `n=${n} labels=${labels} mask=${mask} family=${allowSameFamily} age=${ageRule}`,
              ).toBe(expected)
              if (!feasibility.ok) continue

              for (const order of permutations(aged.map((person) => person.id))) {
                const assignments: Assignments = {}
                const rng = mulberry32(0x1234abcd)

                for (const drawerId of order) {
                  const drawer = aged.find((person) => person.id === drawerId)!
                  const outcome = drawForPerson(
                    aged,
                    allowSameFamily,
                    assignments,
                    drawerId,
                    rng,
                    ageRule,
                  )
                  expect(outcome.ok).toBe(true)
                  if (!outcome.ok) throw new Error(outcome.message)

                  const target = aged.find(
                    (person) => person.id === outcome.targetId,
                  )!
                  expect(Object.values(assignments)).not.toContain(target.id)
                  if (ageRule) expect(target.isChild).toBe(drawer.isChild)
                  if (!allowSameFamily) {
                    expect(target.familyId).not.toBe(drawer.familyId)
                  }

                  assignments[drawerId] = target.id
                  expect(
                    validatePartialDraw(
                      aged,
                      allowSameFamily,
                      assignments,
                      ageRule,
                    ),
                  ).toEqual([])
                }

                expect(
                  validateCompleteDraw(
                    aged,
                    allowSameFamily,
                    assignments,
                    ageRule,
                  ),
                ).toEqual([])
                expect(Object.keys(assignments)).toHaveLength(n)
                expect(new Set(Object.values(assignments)).size).toBe(n)
              }
            }
          }
        }
      }
    })
  }
})
