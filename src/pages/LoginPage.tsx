import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Zap } from 'lucide-react'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const res = await authApi.login({ email, password })
        login(res.data)
      } else {
        const res = await authApi.register({ email, displayName, password })
        login(res.data)
      }
      navigate('/')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Bir hata oluştu. Tekrar deneyin.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand/20">
            <Zap className="text-brand" size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">SprintMind</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              AI-powered Story Point Planner
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-4">
          {/* Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-surface-border">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-brand text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-brand text-white'
                  : 'text-slate-400 hover:text-white hover:bg-surface-hover'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="label">E-posta</label>
              <input
                type="email"
                className="input"
                placeholder="ornek@firma.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="label">Görünen İsim</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ad Soyad"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div>
              <label className="label">Şifre</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading
                ? 'Lütfen bekleyin…'
                : mode === 'login'
                ? 'Giriş Yap'
                : 'Hesap Oluştur'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500">
          On-premise · Verileriniz sunucunuzda kalır
        </p>
      </div>
    </div>
  )
}
