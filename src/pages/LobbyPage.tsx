import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate, STATUS_LABEL, STATUS_COLOR } from '@/lib/utils'
import type { SessionDto, CreateSessionRequest, SessionType } from '@/types'
import {
  Zap, Plus, Users, LogOut, Loader2, X, ChevronRight,
} from 'lucide-react'

// ─── Create Session Modal ─────────────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void
  onCreate: (s: SessionDto) => void
}

function CreateSessionModal({ onClose, onCreate }: CreateModalProps) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<SessionType>('AI_VOTING')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError(null)
    try {
      const req: CreateSessionRequest = { title: title.trim(), type }
      const res = await sessionsApi.create(req)
      const dto: SessionDto = {
        id: res.data.id,
        title: res.data.title,
        type: res.data.type,
        status: res.data.status,
        createdAt: res.data.createdAt,
        participantCount: res.data.participants.length,
      }
      onCreate(dto)
    } catch {
      setError('Oturum oluşturulamadı.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Yeni Oturum</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Oturum Başlığı</label>
            <input
              type="text"
              className="input"
              placeholder="Örn: Sprint 42 Planning"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Oturum Türü</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {(['AI_VOTING', 'PRE_EFFORT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    type === t
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-surface-border text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <div className="text-sm font-medium">
                    {t === 'AI_VOTING' ? '🤖 AI Oylama' : '📋 Ön Efor'}
                  </div>
                  <div className="text-xs mt-0.5 text-slate-500">
                    {t === 'AI_VOTING'
                      ? 'AI önerisi + ekip oylaması'
                      : 'Detaylı planlama'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-accent-red bg-accent-red/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">
              İptal
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              {loading ? 'Oluşturuluyor…' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Session Card ─────────────────────────────────────────────────────────
function SessionCard({ session, onClick }: { session: SessionDto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card p-4 w-full text-left hover:border-brand/50 hover:bg-surface-card/80 transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`badge ${STATUS_COLOR[session.status]}`}
            >
              {STATUS_LABEL[session.status]}
            </span>
            <span className="badge bg-slate-700/50 text-slate-400">
              {session.type === 'AI_VOTING' ? '🤖 AI' : '📋 Ön Efor'}
            </span>
          </div>
          <h3 className="font-medium text-white mt-2 truncate">{session.title}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {session.participantCount}
            </span>
            <span>{formatDate(session.createdAt)}</span>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="text-slate-600 group-hover:text-brand transition-colors mt-0.5 shrink-0"
        />
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function LobbyPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [sessions, setSessions] = useState<SessionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    sessionsApi
      .list()
      .then((res) => setSessions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleCreated(s: SessionDto) {
    setSessions((prev) => [s, ...prev])
    setShowCreate(false)
    navigate(`/sessions/${s.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b border-surface-border bg-surface-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-brand" size={20} />
            <span className="font-semibold text-white">SprintMind</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">
              {user?.displayName}
            </span>
            <button
              type="button"
              onClick={logout}
              className="btn-ghost p-2 rounded-lg"
              title="Çıkış Yap"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Planlama Oturumları</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Katıldığınız veya oluşturduğunuz oturumlar
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            Yeni Oturum
          </button>
        </div>

        {/* Sessions */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500">
            <Loader2 size={24} className="animate-spin mr-2" />
            Yükleniyor…
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <div className="w-14 h-14 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto">
              <Zap className="text-slate-600" size={24} />
            </div>
            <p className="text-slate-400">Henüz oturum yok.</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="btn-primary mx-auto"
            >
              <Plus size={16} />
              İlk Oturumu Oluştur
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => navigate(`/sessions/${s.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateSessionModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  )
}
