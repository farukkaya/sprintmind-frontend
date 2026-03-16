import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { AuthResponse } from '@/types'

interface AuthUser {
  userId: string
  email: string
  displayName: string
  role: string
  token: string
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (resp: AuthResponse) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('sm_user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)

  const login = useCallback((resp: AuthResponse) => {
    const u: AuthUser = {
      userId: resp.userId,
      email: resp.email,
      displayName: resp.displayName,
      role: resp.role,
      token: resp.token,
    }
    localStorage.setItem('sm_token', resp.token)
    localStorage.setItem('sm_user', JSON.stringify(u))
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sm_token')
    localStorage.removeItem('sm_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
