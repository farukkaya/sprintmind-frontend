import * as signalR from '@microsoft/signalr'
import type {
  ParticipantDto, VoteReceivedEvent, StatusChangedEvent, VotesRevealedEvent
} from '@/types'

// Vite proxy (/hubs → http://localhost:5000) üzerinden bağlan.
// Relative URL kullanmak CORS sorununu tamamen ortadan kaldırır.
const HUB_URL = '/hubs/planning'

let connection: signalR.HubConnection | null = null

export function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('sm_token') ?? '',
        // WebSocket tercihli, Long Polling fallback
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()
  }
  return connection
}

export async function startConnection(): Promise<void> {
  const conn = getConnection()
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start()
  }
}

export async function stopConnection(): Promise<void> {
  if (connection) {
    await connection.stop()
    connection = null
  }
}

// ─── Hub methods (client → server) ────────────────────────────────────────
export async function joinSession(sessionId: string): Promise<void> {
  await getConnection().invoke('JoinSession', sessionId)
}

export async function leaveSession(sessionId: string): Promise<void> {
  await getConnection().invoke('LeaveSession', sessionId)
}

export async function castVoteHub(
  sessionId: string,
  itemId: string,
  value: number,
): Promise<void> {
  await getConnection().invoke('CastVote', sessionId, itemId, value)
}

export async function changeStatusHub(
  sessionId: string,
  newStatus: string,
): Promise<void> {
  await getConnection().invoke('ChangeStatus', sessionId, newStatus)
}

// ─── Hub events (server → client) ─────────────────────────────────────────
export function onUserJoined(
  cb: (participant: ParticipantDto) => void,
): () => void {
  const conn = getConnection()
  conn.on('UserJoined', cb)
  return () => conn.off('UserJoined', cb)
}

export function onUserLeft(
  cb: (userId: string) => void,
): () => void {
  const conn = getConnection()
  conn.on('UserLeft', cb)
  return () => conn.off('UserLeft', cb)
}

export function onVoteReceived(
  cb: (event: VoteReceivedEvent) => void,
): () => void {
  const conn = getConnection()
  conn.on('VoteReceived', cb)
  return () => conn.off('VoteReceived', cb)
}

export function onStatusChanged(
  cb: (event: StatusChangedEvent) => void,
): () => void {
  const conn = getConnection()
  conn.on('StatusChanged', cb)
  return () => conn.off('StatusChanged', cb)
}

export function onVotesRevealed(
  cb: (event: VotesRevealedEvent) => void,
): () => void {
  const conn = getConnection()
  conn.on('VotesRevealed', cb)
  return () => conn.off('VotesRevealed', cb)
}
