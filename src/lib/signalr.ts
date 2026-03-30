import * as signalR from '@microsoft/signalr'
import type {
  ParticipantDto, VoteReceivedEvent, StatusChangedEvent, VotesRevealedEvent
} from '@/types'

const HUB_URL = '/hubs/planning'

let connection: signalR.HubConnection | null = null

// Reconnect sonrası hangi session'a geri katılacağımızı bilmek için
let activeSessionId: string | null = null

export function getConnection(): signalR.HubConnection {
  if (!connection) {
    connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('sm_token') ?? '',
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    // Reconnect olunca grup üyeliği sıfırlanır — session'a tekrar katıl
    connection.onreconnected(async () => {
      if (activeSessionId) {
        try {
          await connection!.invoke('JoinSession', activeSessionId)
        } catch {
          // ignore
        }
      }
    })
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
    // connection objesini null yapma — listener'lar ve activeSessionId korunur
    // böylece aynı obje üzerinde start/stop döngüsü güvenli çalışır
  }
}

// ─── Hub methods (client → server) ────────────────────────────────────────
export async function joinSession(sessionId: string): Promise<void> {
  activeSessionId = sessionId
  await getConnection().invoke('JoinSession', sessionId)
}

export async function leaveSession(sessionId: string): Promise<void> {
  activeSessionId = null
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
  cb: (data: unknown) => void,
): () => void {
  const conn = getConnection()
  conn.on('UserLeft', cb)
  return () => conn.off('UserLeft', cb)
}

export function onItemAdded(
  cb: (data: unknown) => void,
): () => void {
  const conn = getConnection()
  conn.on('ItemAdded', cb)
  return () => conn.off('ItemAdded', cb)
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
