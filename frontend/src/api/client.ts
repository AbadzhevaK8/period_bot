export interface TelegramAuthResponse {
  token: string
  user: {
    id: number
    firstName: string
    username?: string
  }
}

function serializeInitData(initData: any): string {
  if (typeof initData === 'string') return initData
  if (!initData || typeof initData !== 'object') return ''
  const keys = Object.keys(initData).sort()
  return keys.map((k) => `${k}=${encodeURIComponent(String((initData as any)[k]))}`).join('&')
}

export async function authTelegram(initData: any) {
  const payload = { initData: serializeInitData(initData) }

  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Authorization failed ${response.status}: ${text}`)
  }

  return response.json() as Promise<TelegramAuthResponse>
}

export interface CycleEntry {
  id: number
  userId: number
  periodStart: string
  cycleLength: number
  periodLength: number
  createdAt: string
}

export interface DayInfo {
  date: string
  dayOfCycle: number
  phase: {
    name: string
    dayOfCycle: number
    color: string
    energy: string
  }
  forecast: string
}

export interface SaveCyclePayload {
  periodStart: string
  cycleLength: number
  periodLength: number
}

export interface RecordCycleStartPayload {
  periodStart: string
}

export interface SymptomLog {
  id: number
  userId: number
  date: string
  energy: number
  mood: string[]
  body: string[]
  note: string
  createdAt: string
}

export interface SaveSymptomPayload {
  date: string
  energy: number
  mood: string[]
  body: string[]
  note: string
}

export interface Pattern {
  phase: string
  symptom: string
  occurrences: number
  message: string
}

function authHeaders() {
  const token = localStorage.getItem('auth_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    const error = new Error(text || `Request failed ${response.status}`)
    ;(error as any).status = response.status
    throw error
  }

  return response.json() as Promise<T>
}

export function getCycle() {
  return apiRequest<CycleEntry>('/api/cycle')
}

export function saveCycle(payload: SaveCyclePayload) {
  return apiRequest<{ status: string }>('/api/cycle', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function recordCycleStart(payload: RecordCycleStartPayload) {
  return apiRequest<{ status: string }>('/api/cycle/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getCalendar(from: string, to: string) {
  const params = new URLSearchParams({ from, to })
  return apiRequest<DayInfo[]>(`/api/calendar?${params.toString()}`)
}

export function getSymptom(date: string) {
  return apiRequest<SymptomLog>(`/api/symptoms/${date}`)
}

export function getSymptoms(from: string, to: string) {
  const params = new URLSearchParams({ from, to })
  return apiRequest<SymptomLog[]>(`/api/symptoms?${params.toString()}`)
}

export function saveSymptom(payload: SaveSymptomPayload) {
  return apiRequest<{ status: string }>('/api/symptoms', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getInsights() {
  return apiRequest<Pattern[]>('/api/insights')
}
