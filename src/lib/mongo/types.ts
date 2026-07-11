export type UserId = string

export type User = {
  _id: UserId
  email: string
  passwordHash: string
  fullName?: string
  createdAt: Date

  // Profile (UC-3)
  avatarUrl?: string | null
  preferences?: {
    marketingEmails?: boolean
    [key: string]: any
  }

  // Email verification
  emailVerified: boolean
  verificationToken?: string
  verificationTokenExpiresAt?: Date

  // Password reset
  passwordResetToken?: string
  passwordResetTokenExpiresAt?: Date
}



