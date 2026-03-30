import { useState, type FormEvent } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, Loader2 } from 'lucide-react'

export default function ProtectedRoute() {
  const { isAuthenticated, initializing, guestLogin } = useAuth()
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 size={24} className="animate-spin mr-2" />
        Yükleniyor…
      </div>
    )
  }

  if (isAuthenticated) return <Outlet />

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError(null)
    try {
      await guestLogin(nickname.trim())
    } catch {
      setError('Bağlanılamadı. Tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand/20">
            <Zap className="text-brand" size={24} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">SprintMind</h1>
            <p className="text-sm text-slate-400 mt-0.5">Oturuma katılmak için bir takma ad belirle</p>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <form onSubmit={handleJoin} className="space-y-3">
            <div>
              <label className="label">Takma Adın</label>
              <input
                type="text"
                className="input"
                placeholder="Örn: Ahmet"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={32}
                required
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1">
                Bu bilgisayardan aynı takma adla tüm oturumlara katılırsın.
              </p>
            </div>

            {error && (
              <p className="text-xs text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !nickname.trim()}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Katılınıyor…' : 'Katıl'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
