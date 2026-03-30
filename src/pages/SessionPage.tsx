import { useState, useEffect, useCallback, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsApi } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import {
  startConnection, stopConnection, joinSession, leaveSession,
  onUserJoined, onUserLeft, onVoteReceived, onStatusChanged, onVotesRevealed,
  onItemAdded, changeStatusHub,
} from '@/lib/signalr'
import {
  STATUS_LABEL, STATUS_COLOR, NEXT_STATUS, NEXT_STATUS_LABEL,
} from '@/lib/utils'
import {
  SP_LABEL, FIBONACCI_VALUES,
  type SessionDetailDto, type SessionItemDto, type SessionStatus, type FibonacciSp,
} from '@/types'
import {
  ArrowLeft, Plus, Users, Loader2, CheckCircle2, Clock, Wifi, WifiOff, Link2, Check, X,
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
    } catch (ex){
console.error('Vote failed', ex)
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

// ─── Poker Card ──────────────────────────────────────────────────────────────
function PokerCard({
  hasVoted,
  value,
  revealed,
}: {
  hasVoted: boolean
  value: FibonacciSp | null
  revealed: boolean
}) {
  if (!hasVoted) {
    return <div className="w-9 h-12 rounded-md border-2 border-dashed border-slate-700" />
  }
  if (!revealed) {
    return (
      <div className="w-9 h-12 rounded-md bg-brand/70 border border-brand/40 flex items-center justify-center">
        <div className="w-5 h-7 rounded border border-white/20" />
      </div>
    )
  }
  return (
    <div className="w-9 h-12 rounded-md bg-white flex items-center justify-center shadow-md">
      <span className="text-slate-900 font-bold text-sm">
        {value !== null ? SP_LABEL[value] : '–'}
      </span>
    </div>
  )
}

// ─── Poker Table Modal ────────────────────────────────────────────────────────
function PokerTableModal({
  item,
  session,
  currentUserId,
  isOwner,
  sessionId,
  onClose,
  onReveal,
}: {
  item: SessionItemDto
  session: SessionDetailDto
  currentUserId: string
  isOwner: boolean
  sessionId: string
  onClose: () => void
  onReveal: () => void
}) {
  const [myVote, setMyVote] = useState<FibonacciSp | null>(
    () => (item.votes.find((v) => v.userId === currentUserId)?.value as FibonacciSp) ?? null,
  )
  const [loadingVote, setLoadingVote] = useState<number | null>(null)

  const { status } = session
  const revealed = status === 'Revealed' || status === 'Completed'
  const seated = session.participants.filter((p) => p.isConnected)

  async function handleVote(v: FibonacciSp) {
    setLoadingVote(v)
    try {
      await sessionsApi.castVote(sessionId, item.id, v)
      setMyVote(v)
    } catch (ex) {
      console.error('Vote failed', ex)
    } finally {
      setLoadingVote(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate">{item.title}</p>
            {item.description && (
              <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
            )}
            {item.aiSummary && (
              <p className="text-xs text-slate-400 mt-1 bg-surface rounded-lg px-2 py-1 border border-surface-border">
                <span className="text-brand-light font-medium">🤖 AI: </span>
                {item.aiSummary}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5 rounded-lg shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="relative" style={{ height: 340 }}>
          {/* Oval table surface */}
          <div
            className="absolute bg-surface-card/80 border border-surface-border rounded-[50%] flex items-center justify-center"
            style={{ inset: '55px 70px' }}
          >
            <div className="flex flex-col items-center gap-2 text-center px-6">
              {isOwner && status === 'Voting' && (
                <button type="button" onClick={onReveal} className="btn-primary text-sm">
                  Oyları Aç
                </button>
              )}
              {status === 'Waiting' && (
                <p className="text-xs text-slate-500">Oylama henüz başlamadı</p>
              )}
              {status === 'Voting' && !isOwner && (
                <p className="text-xs text-slate-500">Kartınızı seçin</p>
              )}
              {revealed && item.votes.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {item.votes.map((v) => (
                    <span
                      key={v.userId}
                      className="text-xs bg-surface-hover rounded px-2 py-0.5 text-slate-300"
                    >
                      <span className="font-bold text-white">
                        {v.value !== null ? SP_LABEL[v.value] : '–'}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Participants around the table */}
          {seated.map((p, i) => {
            const angle = (i / seated.length) * 2 * Math.PI - Math.PI / 2
            const left = `${50 + 44 * Math.cos(angle)}%`
            const top = `${50 + 38 * Math.sin(angle)}%`
            const vote = item.votes.find((v) => v.userId === p.userId)
            const isMe = p.userId === currentUserId
            const isTopHalf = Math.sin(angle) < 0

            const avatar = (
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isMe
                    ? 'bg-brand text-white ring-2 ring-brand/40'
                    : 'bg-surface-hover text-slate-300'
                }`}
              >
                {p.displayName.charAt(0).toUpperCase()}
              </div>
            )
            const nameTag = (
              <span className="text-[10px] text-slate-400 whitespace-nowrap max-w-[4.5rem] truncate">
                {isMe ? 'Sen' : p.displayName}
              </span>
            )
            const card = (
              <PokerCard hasVoted={!!vote} value={vote?.value ?? null} revealed={revealed} />
            )

            return (
              <div
                key={p.userId}
                className="absolute flex flex-col items-center gap-0.5"
                style={{ left, top, transform: 'translate(-50%, -50%)' }}
              >
                {isTopHalf ? (
                  <>{avatar}{nameTag}{card}</>
                ) : (
                  <>{card}{avatar}{nameTag}</>
                )}
              </div>
            )
          })}
        </div>

        {/* Voting cards */}
        {status === 'Voting' && (
          <div className="flex flex-wrap justify-center gap-2">
            {FIBONACCI_VALUES.map((v) => (
              <button
                key={v}
                type="button"
                disabled={loadingVote !== null}
                onClick={() => handleVote(v as FibonacciSp)}
                className={`w-11 h-14 rounded-lg border text-sm font-bold transition-all ${
                  myVote === v
                    ? 'bg-brand border-brand text-white shadow-lg shadow-brand/30 scale-105'
                    : 'border-surface-border bg-surface hover:border-brand/60 hover:bg-brand/10 text-slate-300'
                }`}
              >
                {loadingVote === v ? (
                  <Loader2 size={12} className="animate-spin mx-auto" />
                ) : (
                  SP_LABEL[v]
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Session Item ─────────────────────────────────────────────────────────
function SessionItemRow({
  item,
  sessionId,
  status,
  currentUserId,
  participantCount,
  isActive,
  onClick,
}: {
  item: SessionItemDto
  sessionId: string
  status: SessionStatus
  currentUserId: string
  participantCount: number
  isActive: boolean
  onClick: () => void
}) {
  const myVote =
    (item.votes.find((v) => v.userId === currentUserId)?.value as FibonacciSp) ?? null

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
                {votedCount}/{participantCount}
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

    </div>
  )
}

// ─── Add Item Form ────────────────────────────────────────────────────────
function AddItemForm({
  sessionId,
  onAdded,
}: {
  sessionId: string
  onAdded: () => void
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
      await sessionsApi.addItem(sessionId, {
        title: title.trim(),
        description: description.trim() || undefined,
      })
      onAdded()
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
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    async function connect() {
      try {
        await startConnection()
        await joinSession(sessionId!)
        if (active) {
          setConnected(true)
          await fetchSession()
        }
      } catch {
        if (active) {
          retryTimeout = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    const offUserJoined = onUserJoined(() => {
      fetchSession()
    })

    const offUserLeft = onUserLeft(() => {
      fetchSession()
    })

    const offItemAdded = onItemAdded(() => {
      fetchSession()
    })

    const offVoteReceived = onVoteReceived(() => {
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
      if (retryTimeout) clearTimeout(retryTimeout)
      offUserJoined()
      offUserLeft()
      offItemAdded()
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
              Backlog ({session.items?.length})
            </h2>
          </div>

          {session.items?.length === 0 && session.status === 'Waiting' && (
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
              participantCount={session.participants.length}
              isActive={activeItemId === item.id}
              onClick={() =>
                setActiveItemId((prev) => (prev === item.id ? null : item.id))
              }
            />
          ))}

          {session.status === 'Waiting' && (
            <AddItemForm
              sessionId={session.id}
              onAdded={fetchSession}
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

      {/* Poker Table Modal */}
      {activeItemId && (() => {
        const activeItem = session.items.find((i) => i.id === activeItemId)
        if (!activeItem) return null
        return (
          <PokerTableModal
            item={activeItem}
            session={session}
            currentUserId={user?.userId ?? ''}
            isOwner={isOwner}
            sessionId={session.id}
            onClose={() => setActiveItemId(null)}
            onReveal={handleStatusChange}
          />
        )
      })()}
    </div>
  )
}
