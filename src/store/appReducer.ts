import type { AppState, Family, Person } from '../types'
import { isPairAllowed } from '../lib/draw'

export type AppAction =
  | { type: 'family/add'; family: Family }
  | { type: 'family/rename'; id: string; name: string }
  | { type: 'family/remove'; id: string }
  | { type: 'person/add'; person: Person }
  | { type: 'person/update'; id: string; name: string; familyId: string; isChild: boolean }
  | { type: 'person/remove'; id: string }
  | { type: 'settings/setAllowSameFamily'; allow: boolean }
  | { type: 'settings/setOnlyChildrenDrawChildren'; onlyChildrenDrawChildren: boolean }
  | { type: 'draw/assign'; drawerId: string; targetId: string }
  | { type: 'draw/reset' }

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'family/add': {
      if (state.families.some((family) => family.id === action.family.id)) {
        return state
      }
      return { ...state, families: [...state.families, action.family] }
    }

    case 'family/rename': {
      return {
        ...state,
        families: state.families.map((family) =>
          family.id === action.id ? { ...family, name: action.name } : family,
        ),
      }
    }

    case 'family/remove': {
      if (state.people.some((person) => person.familyId === action.id)) {
        return state
      }
      return {
        ...state,
        families: state.families.filter((family) => family.id !== action.id),
      }
    }

    case 'person/add': {
      if (state.people.some((person) => person.id === action.person.id)) {
        return state
      }
      if (!state.families.some((family) => family.id === action.person.familyId)) {
        return state
      }
      return {
        ...state,
        people: [...state.people, action.person],
        draw: { assignments: {} },
      }
    }

    case 'person/update': {
      const existing = state.people.find((person) => person.id === action.id)
      if (!existing) return state
      if (!state.families.some((family) => family.id === action.familyId)) {
        return state
      }

      const constraintsChanged =
        existing.familyId !== action.familyId || existing.isChild !== action.isChild
      const people = state.people.map((person) =>
        person.id === action.id
          ? {
              ...person,
              name: action.name,
              familyId: action.familyId,
              isChild: action.isChild,
            }
          : person,
      )

      return {
        ...state,
        people,
        draw: constraintsChanged ? { assignments: {} } : state.draw,
      }
    }

    case 'person/remove': {
      if (!state.people.some((person) => person.id === action.id)) return state
      return {
        ...state,
        people: state.people.filter((person) => person.id !== action.id),
        draw: { assignments: {} },
      }
    }

    case 'settings/setAllowSameFamily': {
      if (state.settings.allowSameFamily === action.allow) return state
      const hasDraw = Object.keys(state.draw.assignments).length > 0
      return {
        ...state,
        settings: { ...state.settings, allowSameFamily: action.allow },
        draw: hasDraw ? { assignments: {} } : state.draw,
      }
    }

    case 'settings/setOnlyChildrenDrawChildren': {
      if (
        state.settings.onlyChildrenDrawChildren ===
        action.onlyChildrenDrawChildren
      ) {
        return state
      }
      const hasDraw = Object.keys(state.draw.assignments).length > 0
      return {
        ...state,
        settings: {
          ...state.settings,
          onlyChildrenDrawChildren: action.onlyChildrenDrawChildren,
        },
        draw: hasDraw ? { assignments: {} } : state.draw,
      }
    }

    case 'draw/assign': {
      const drawer = state.people.find((person) => person.id === action.drawerId)
      const target = state.people.find((person) => person.id === action.targetId)
      if (!drawer || !target) return state
      if (Object.hasOwn(state.draw.assignments, action.drawerId)) return state
      if (Object.values(state.draw.assignments).includes(action.targetId)) {
        return state
      }
      if (
        !isPairAllowed(
          drawer,
          target,
          state.settings.allowSameFamily,
          state.settings.onlyChildrenDrawChildren,
        )
      ) {
        return state
      }

      return {
        ...state,
        draw: {
          assignments: {
            ...state.draw.assignments,
            [action.drawerId]: action.targetId,
          },
        },
      }
    }

    case 'draw/reset': {
      return { ...state, draw: { assignments: {} } }
    }
  }
}

export function wouldResetDraw(state: AppState, action: AppAction): boolean {
  if (Object.keys(state.draw.assignments).length === 0) return false
  const next = appReducer(state, action)
  return Object.keys(next.draw.assignments).length === 0
}
