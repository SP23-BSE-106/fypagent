export type UserSettings = {
  _id?: string
  userId: string
  preferences?: {
    /** Example: marketing emails toggle */
    marketingEmails?: boolean
    [key: string]: unknown
  }

  createdAt: Date
  updatedAt?: Date
}

