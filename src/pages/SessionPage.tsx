import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  startConnection, stopConnection, joinSession, leaveSession,
  onUserJoined, onUserLeft, onVoteReceived, onStatusChanged, onVotesRevealed,
  changeStatusHub,
} from '@/lib/signalr'
import {
  STATUS_LABEL, STATUS_COLOR, NEXT_STATUS, NEXT_STATUS_LABEL,
} from '@/lib/utils'
import {
  SP_LABEL, FIBONACCI_VALUES,
  type SessionDetailDto, type SessionItemDto, type SessionStatus, type FibonacciSp,
} from '@/types'
import {
  ArrowLeft, Plus, Users, Loader2, CheckCircle2, Clock, Wifi, WifiOff, Link2, Check,
} from 'lucide-react'

// ─── Voting Cards ─────────────────────────────────────────────────────────
function VotingCards({
  itemId,
  sessionId,
  status,
  myVote,
  onVoted,
}: {
  itemId: string
  sessionId: string
  status: SessionStatus
  myVote: FibonacciSp | null
  onVoted: (v: FibonacciSp) => void
}) {
  const [loading, setLoading] = useState<number | null>(null)

  if (status !== 'Voting') return null

  async function handleVote(v: FibonacciSp) {
    setLoading(v)
    try {
      await sessionsApi.castVote(sessionId, itemId, v)
      onVoted(v)
    } catch {
      // ignore
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {FIBONACCI_VALUES.map((v) => (
        <button
          key={v}
          type="button"
          disabled={loading !== null}
          onClick={() => handleVote(v as FibonacciSp)}
          className={`w-12 h-14 rounded-lg border text-sm font-bold transition-all ${
            myVote === v
              ? 'bg-brand border-brand text-white shadow-lg shadow-brand/30 scale-105'
              : 'border-surface-border bg-surface hover:border-brand/60 hover:bg-brand/10 text-slate-300'
          }`}
        >
          {loading === v ? (
            <Loader2 size={12} className="animate-spin mx-auto" />
          ) : (
            SP_LABEL[v]
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Session Item ─────────────────────────────────────────────────────────
function SessionItemRow({
  item,
  sessionId,
  status,
  currentUserId,
  isActive,
  onClick,
}: {
  item: SessionItemDto
  sessionId: string
  status: SessionStatus
  currentUserId: string
  isActive: boolean
  onClick: () => void
}) {
  const [myVote, setMyVote] = useState<FibonacciSp | null>(
    () =>
      (item.votes.find((v) => v.userId === currentUserId)?.value as FibonacciSp) ??
      null,
  )

  const votedCount = item.votes.filter((v) => v.value !== null).length

  return (
    <div
      className={`rounded-lg border transition-all ${
        isActive
          ? 'border-brand/50 bg-brand/5'
          : 'border-surface-border bg-surface-card hover:border-surface-hover'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left p-3"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {item.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Vote progress */}
            {(status === 'Voting' || status === 'Revealed') && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Users size={11} />
                {votedCount}
              </span>
            )}
            {/* Final SP */}
            {item.finalSp !== null && (
              <span className="badge bg-accent-green/20 text-accent-green font-bold">
                {SP_LABEL[item.finalSp]}
              </span>
            )}
            {/* AI suggestion */}
            {item.aiSuggestedSp !== null && item.finalSp === null && (
              <span className="badge bg-brand/20 text-brand-light">
                🤖 {SP_LABEL[item.aiSuggestedSp]}
              </span>
            )}
            {/* My vote indicator */}
            {myVote !== null && status === 'Voting' && (
              <CheckCircle2 size={14} className="text-accent-green" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded: voting panel */}
      {isActive && (
        <div className="px-3 pb-3 space-y-3 border-t border-surface-border pt-3">
          {/* AI Summary */}
          {item.aiSummary && (
            <div className="text-xs text-slate-400 bg-surface rounded-lg p-2 border border-surface-border">
              <span className="text-brand-light font-medium">🤖 AI: </span>
              {item.aiSummary}
            </div>
          )}

          {/* Voting cards */}
          <VotingCards
            itemId={item.id}
            sessionId={sessionId}
            status={status}
            myVote={myVote}
            onVoted={setMyVote}
          />

          {/* Revealed votes */}
          {(status === 'Revealed' || status === 'Completed') &&
            item.votes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-slate-500 font-medium">Oylar:</p>
                <div className="flex flex-wrap gap-2">
                  {item.votes.map((v) => (
                    <div
                      key={v.userId}
                      className="flex items-center gap-1.5 bg-surface-hover rounded-md px-2 py-1"
                    >
                      <span className="text-xs text-slate-400">{v.displayName}</span>
                      <span className="text-xs font-bold text-white">
                        {v.value !== null ? SP_LABEL[v.value] : '–'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

// ─── Add Item Form ────────────────────────────────────────────────────────
function AddItemForm({
  sessionId,
  onAdded,
}: {
  sessionId: string
  onAdded: (session: SessionDetailDto) => void
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await sessionsApi.addItem(sessionId, {
        title: title.trim(),
        description: description.trim() || undefined,
      })
      onAdded(res.data)
      setTitle('')
      setDescription('')
      setOpen(false)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full p-3 rounded-lg border border-dashed border-surface-border text-slate-500 hover:border-brand/50 hover:text-brand transition-colors text-sm"
      >
        <Plus size={14} />
        Backlog Ekle
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-3 space-y-2">
      <input
        type="text"
        className="input text-sm"
        placeholder="Başlık"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        autoFocus
      />
      <textarea
        className="input text-sm resize-none"
        rows={2}
        placeholder="Açıklama (isteğe bağlı)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-ghost text-xs px-3 py-1.5"
        >
          İptal
        </button>
        <button
          type="submit"
          className="btn-primary text-xs px-3 py-1.5"
          disabled={loading}
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Ekle
        </button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [session, setSession] = useState<SessionDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function copyInviteLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    })
  }

  const fetchSession = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await sessionsApi.getById(sessionId)
      setSession(res.data)
    } catch {
      navigate('/')
    }
  }, [sessionId, navigate])

  // Initial load
  useEffect(() => {
    fetchSession().finally(() => setLoading(false))
  }, [fetchSession])

  // SignalR connection
  useEffect(() => {
    if (!sessionId) return

    let active = true

    async function connect() {
      try {
        await startConnection()
        await joinSession(sessionId!)
        if (active) setConnected(true)
      } catch {
        // retry handled by withAutomaticReconnect
      }
    }

    connect()

    const offUserJoined = onUserJoined((p) => {
      setSession((s) => {
        if (!s) return s
        const exists = s.participants.find((x) => x.userId === p.userId)
        return {
          ...s,
          participants: exists
            ? s.participants.map((x) =>
                x.userId === p.userId ? { ...x, isConnected: true } : x,
              )
            : [...s.participants, p],
        }
      })
    })

    const offUserLeft = onUserLeft((userId) => {
      setSession((s) => {
        if (!s) return s
        return {
          ...s,
          participants: s.participants.map((x) =>
            x.userId === userId ? { ...x, isConnected: false } : x,
          ),
        }
      })
    })

    const offVoteReceived = onVoteReceived(() => {
      // Refresh votes count silently
      fetchSession()
    })

    const offStatusChanged = onStatusChanged((evt) => {
      if (evt.sessionId === sessionId) {
        setSession((s) => (s ? { ...s, status: evt.newStatus } : s))
      }
    })

    const offVotesRevealed = onVotesRevealed(() => {
      fetchSession()
    })

    return () => {
      active = false
      offUserJoined()
      offUserLeft()
      offVoteReceived()
      offStatusChanged()
      offVotesRevealed()
      leaveSession(sessionId!).catch(() => null)
      stopConnection()
      setConnected(false)
    }
  }, [sessionId, fetchSession])

  async function handleStatusChange() {
    if (!session) return
    const next = NEXT_STATUS[session.status]
    if (!next) return
    setStatusLoading(true)
    try {
      await changeStatusHub(session.id, next)
      // StatusChanged event will update state
    } catch {
      // fallback to REST
      await sessionsApi.updateStatus(session.id, { status: next })
      setSession((s) => (s ? { ...s, status: next } : s))
    } finally {
      setStatusLoading(false)
    }
  }

  const isOwner = session?.createdBy === user?.userId

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        <Loader2 size={24} className="animate-spin mr-2" />
        Yükleniyor…
      </div>
    )
  }

  if (!session) return null

  const nextLabel = NEXT_STATUS_LABEL[session.status]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="border-b border-surface-border bg-surface-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-ghost p-2 rounded-lg"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-white truncate">{session.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Wifi size={14} className="text-accent-green" />
            ) : (
              <WifiOff size={14} className="text-slate-600" />
            )}
            {/* Davet linki kopyala */}
            <button
              type="button"
              onClick={copyInviteLink}
              className="btn-ghost text-xs px-2 py-1.5 gap-1.5"
              title="Davet linkini kopyala"
            >
              {linkCopied ? (
                <Check size={13} className="text-accent-green" />
              ) : (
                <Link2 size={13} />
              )}
              <span className="hidden sm:inline">
                {linkCopied ? 'Kopyalandı!' : 'Davet'}
              </span>
            </button>
            <span className={`badge ${STATUS_COLOR[session.status]}`}>
              {STATUS_LABEL[session.status]}
            </span>
            {isOwner && nextLabel && (
              <button
                type="button"
                onClick={handleStatusChange}
                disabled={statusLoading}
                className="btn-primary text-xs"
              >
                {statusLoading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                {nextLabel}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 flex gap-4">
        {/* LEFT: Items panel */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-slate-400">
              Backlog ({session.items.length})
            </h2>
          </div>

          {session.items.length === 0 && session.status === 'Waiting' && (
            <p className="text-sm text-slate-500 py-4 text-center">
              Henüz backlog item yok. Aşağıdan ekleyin.
            </p>
          )}

          {session.items.map((item) => (
            <SessionItemRow
              key={item.id}
              item={item}
              sessionId={session.id}
              status={session.status}
              currentUserId={user?.userId ?? ''}
              isActive={activeItemId === item.id}
              onClick={() =>
                setActiveItemId((prev) => (prev === item.id ? null : item.id))
              }
            />
          ))}

          {session.status === 'Waiting' && (
            <AddItemForm
              sessionId={session.id}
              onAdded={(updated) => setSession(updated)}
            />
          )}
        </div>

        {/* RIGHT: Participants panel */}
        <div className="w-56 shrink-0 space-y-3">
          <h2 className="text-sm font-medium text-slate-400">
            Katılımcılar ({session.participants.length})
          </h2>
          <div className="card p-3 space-y-2">
            {session.participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-2">
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    p.isConnected ? 'bg-accent-green' : 'bg-slate-600'
                  }`}
                />
                <span className="text-sm text-slate-300 truncate flex-1">
                  {p.displayName}
                </span>
                {p.userId === session.createdBy && (
                  <span className="text-[10px] text-brand-light">host</span>
                )}
              </div>
            ))}
          </div>

          {/* Session info */}
          <div className="card p-3 space-y-2 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock size={11} />
              <span>
                {session.type === 'AI_VOTING' ? '🤖 AI Oylama' : '📋 Ön Efor'}
              </span>
            </div>
            {session.completedAt && (
              <div className="flex items-center gap-1.5 text-accent-green">
                <CheckCircle2 size={11} />
                <span>Tamamlandı</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
