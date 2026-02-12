export interface AuthResponse {
  token: string
  user: UserInfo
}

export interface UserInfo {
  id: string
  email: string
  displayName?: string
  isAdmin: boolean
}

export interface AuthConfig {
  googleEnabled: boolean
  emailEnabled: boolean
}

export interface JwtPayload {
  sub: string
  email: string
  name?: string
  role?: string
  exp: number
  iat: number
}
