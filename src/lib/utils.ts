import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { SessionStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  Waiting: 'Bekliyor',
  Voting: 'Oylama',
  Revealed: 'Açıklandı',
  Completed: 'Tamamlandı',
}

export const STATUS_COLOR: Record<SessionStatus, string> = {
  Waiting: 'bg-slate-500/20 text-slate-400',
  Voting: 'bg-brand/20 text-brand-light',
  Revealed: 'bg-accent-yellow/20 text-accent-yellow',
  Completed: 'bg-accent-green/20 text-accent-green',
}

export const NEXT_STATUS: Record<SessionStatus, SessionStatus | null> = {
  Waiting: 'Voting',
  Voting: 'Revealed',
  Revealed: 'Completed',
  Completed: null,
}

export const NEXT_STATUS_LABEL: Record<SessionStatus, string | null> = {
  Waiting: 'Oylamayı Başlat',
  Voting: 'Oyları Aç',
  Revealed: 'Tamamla',
  Completed: null,
}
