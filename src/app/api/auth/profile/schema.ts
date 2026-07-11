export type ManageProfilePreferences = Record<string, boolean | string | number | null>

export type ManageProfileProfile = {
  fullName?: string
  email?: string
  avatarUrl?: string | null
  preferences?: ManageProfilePreferences
  emailVerified?: boolean
}

