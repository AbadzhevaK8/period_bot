export interface TelegramAuthResponse {
  token: string
  user: {
    id: number
    firstName: string
    username?: string
  }
}

export async function authTelegram(initData: string) {
  const response = await fetch('/api/auth/telegram', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ initData }),
  })

  if (!response.ok) {
    throw new Error('Authorization failed')
  }

  return response.json() as Promise<TelegramAuthResponse>
}
