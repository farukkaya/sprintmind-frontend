// ─── Enums (must match backend) ───────────────────────────────────────────
export type SessionType = 'AI_VOTING' | 'PRE_EFFORT'
export type SessionStatus = 'Waiting' | 'Voting' | 'Revealed' | 'Completed'
export type ApprovalType = 'AiSuggested' | 'TeamVoted' | 'Overridden'

export const FIBONACCI_VALUES = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, 99] as const
export type FibonacciSp = (typeof FIBONACCI_VALUES)[number]
export const SP_LABEL: Record<number, string> = {
  0: '0', 1: '1', 2: '2', 3: '3', 5: '5',
  8: '8', 13: '13', 20: '20', 40: '40', 100: '100', 99: '?',
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string
  expiresAt: string
  userId: string
  email: string
  displayName: string
  role: string
}

export interface RegisterRequest {
  email: string
  displayName: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

// ─── Sessions ─────────────────────────────────────────────────────────────
export interface SessionDto {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  createdAt: string
  participantCount: number
}

export interface VoteDto {
  userId: string
  displayName: string
  value: FibonacciSp | null
}

export interface SessionItemDto {
  id: string
  title: string
  description: string | null
  aiSummary: string | null
  aiSuggestedSp: FibonacciSp | null
  finalSp: FibonacciSp | null
  approvalType: ApprovalType | null
  orderIndex: number
  votes: VoteDto[]
}

export interface ParticipantDto {
  userId: string
  displayName: string
  isConnected: boolean
}

export interface SessionDetailDto {
  id: string
  title: string
  type: SessionType
  status: SessionStatus
  createdBy: string
  createdAt: string
  completedAt: string | null
  participants: ParticipantDto[]
  items: SessionItemDto[]
}

export interface CreateSessionRequest {
  title: string
  type: SessionType
}

export interface AddSessionItemRequest {
  title: string
  description?: string
}

export interface UpdateSessionStatusRequest {
  status: SessionStatus
}

// ─── SignalR Events ────────────────────────────────────────────────────────
export interface VoteReceivedEvent {
  sessionItemId: string
  userId: string
  displayName: string
  hasVoted: boolean
}

export interface StatusChangedEvent {
  sessionId: string
  newStatus: SessionStatus
}

export interface VotesRevealedEvent {
  sessionItemId: string
  votes: VoteDto[]
}
