import type { User } from './types'

export type UserPublic = {
  _id: User['_id']
  email: string
  fullName?: string
}


