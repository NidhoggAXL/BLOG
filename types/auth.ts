export type AuthUser = {
  id: number
  username: string
  displayName: string | null
}

export type AuthProfile = AuthUser & {
  email: string | null
  bio: string | null
  avatarUrl: string | null
  githubUrl: string | null
  giteeUrl: string | null
  websiteUrl: string | null
  updatedAt: string | null
}

export type UpdateAuthProfilePayload = {
  displayName?: string | null
  email?: string | null
  bio?: string | null
  avatarUrl?: string | null
  githubUrl?: string | null
  giteeUrl?: string | null
  websiteUrl?: string | null
}

export type UpdateAuthPasswordPayload = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
