export type UserId = string

export type User = {
  _id: UserId
  email: string
  passwordHash: string
  fullName?: string
  createdAt: Date
}

