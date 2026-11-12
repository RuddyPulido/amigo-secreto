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

// Dados de acesso: ficam separados da lista pública de pessoas.
export interface Credential {
  phone: string
  passwordHash?: string
  inviteToken?: string
}

export interface DrawState {
  open: boolean
  assignments: Assignments
  // Quem já sorteou (sem o resultado): é o que o organizador enxerga.
  drawn: Record<Id, true>
}

export type Session =
  | { role: 'master' }
  | { role: 'person'; personId: Id; passwordHash: string }
