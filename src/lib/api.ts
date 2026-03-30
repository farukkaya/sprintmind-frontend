import axios from 'axios'
import type {
  AuthResponse, LoginRequest, RegisterRequest,
  SessionDto, SessionDetailDto, CreateSessionRequest,
  AddSessionItemRequest, UpdateSessionStatusRequest,
  FibonacciSp,
} from '@/types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token from localStorage on each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sm_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 gelirse token'ı temizle (yönlendirme AuthContext'e bırakılır)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sm_token')
      localStorage.removeItem('sm_user')
    }
    return Promise.reject(err)
  },
)

// ─── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<AuthResponse>('/api/auth/register', data),
  login: (data: LoginRequest) =>
    api.post<AuthResponse>('/api/auth/login', data),
  guestLogin: (data: { nickname: string; deviceId: string }) =>
    api.post<AuthResponse>('/api/auth/guest', data),
}

// ─── Sessions ────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: () =>
    api.get<SessionDto[]>('/api/sessions'),
  getById: (id: string) =>
    api.get<SessionDetailDto>(`/api/sessions/${id}`),
  create: (data: CreateSessionRequest) =>
    api.post<SessionDto>('/api/sessions', data),
  updateStatus: (id: string, data: UpdateSessionStatusRequest) =>
    api.put(`/api/sessions/${id}/status`, data),
  addItem: (sessionId: string, data: AddSessionItemRequest) =>
    api.post<SessionDetailDto>(`/api/sessions/${sessionId}/items`, data),
  castVote: (sessionId: string, itemId: string, value: FibonacciSp) =>
    api.post(`/api/sessions/${sessionId}/items/${itemId}/vote`, { value: String(value) }),
}

export default api
