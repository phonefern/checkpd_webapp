export type ActivityAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
export type ActivityPage = 'auth' | 'users' | 'qa'

export interface ActivityEntry {
  id: string
  timestamp: string
  action: ActivityAction
  page: ActivityPage
  description: string
  userEmail?: string
}

const STORAGE_KEY = 'pd_activity_logs'
const MAX_ENTRIES = 500

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return
  try {
    const existing = getActivityLogs()
    const newEntry: ActivityEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }
    const updated = [newEntry, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // silently ignore storage errors
  }
}

export function getActivityLogs(): ActivityEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : []
  } catch {
    return []
  }
}

export function clearActivityLogs(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
