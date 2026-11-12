export type Id = string

export interface Family {
  id: Id
  name: string
}

export interface Person {
  id: Id
  name: string
  familyId: Id
  isChild: boolean
}

export type Assignments = Record<Id, Id>

export interface AppSettings {
  allowSameFamily: boolean
  onlyChildrenDrawChildren: boolean
}

export interface DrawState {
  assignments: Assignments
}

export interface AppState {
  version: 1
  families: Family[]
  people: Person[]
  settings: AppSettings
  draw: DrawState
}
