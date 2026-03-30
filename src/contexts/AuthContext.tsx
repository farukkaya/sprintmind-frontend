import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from 'react'
import { authApi } from '@/lib/api'
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
  initializing: boolean
  login: (resp: AuthResponse) => void
  guestLogin: (nickname: string) => Promise<void>
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

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem('sm_device_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('sm_device_id', id)
  }
  return id
}

function saveUser(resp: AuthResponse): AuthUser {
  const u: AuthUser = {
    userId:      resp.userId,
    email:       resp.email,
    displayName: resp.displayName,
    role:        resp.role,
    token:       resp.token,
  }
  localStorage.setItem('sm_token', resp.token)
  localStorage.setItem('sm_user', JSON.stringify(u))
  return u
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser)
  const [initializing, setInitializing] = useState(() => {
    // Kaydedilmiş nickname var ama token yok → otomatik guest login gerekli
    return !loadUser() && !!localStorage.getItem('sm_nickname')
  })

  // Uygulama açıldığında nickname varsa otomatik giriş yap
  useEffect(() => {
    if (!initializing) return
    const nickname = localStorage.getItem('sm_nickname')
    if (!nickname) { setInitializing(false); return }

    authApi.guestLogin({ nickname, deviceId: getOrCreateDeviceId() })
      .then((res) => setUser(saveUser(res.data)))
      .catch(() => {})
      .finally(() => setInitializing(false))
  }, [initializing])

  const login = useCallback((resp: AuthResponse) => {
    setUser(saveUser(resp))
  }, [])

  const guestLogin = useCallback(async (nickname: string) => {
    const res = await authApi.guestLogin({
      nickname,
      deviceId: getOrCreateDeviceId(),
    })
    localStorage.setItem('sm_nickname', nickname)
    setUser(saveUser(res.data))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('sm_token')
    localStorage.removeItem('sm_user')
    localStorage.removeItem('sm_nickname')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, initializing, login, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
