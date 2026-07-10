export type UserId = string

export type User = {
  _id: UserId
  email: string
  passwordHash: string
  fullName?: string
  createdAt: Date

  // Email verification
  emailVerified: boolean
  verificationToken?: string
  verificationTokenExpiresAt?: Date

  // Password reset
  passwordResetToken?: string
  passwordResetTokenExpiresAt?: Date
}


