const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toBase64Url(signature)
}

export async function createSignedState(secret: string): Promise<string> {
  const nonce = crypto.randomUUID()
  const timestamp = Date.now().toString()
  const signature = await hmacSign(secret, `${nonce}.${timestamp}`)
  return `${nonce}.${timestamp}.${signature}`
}

export async function verifySignedState(
  secret: string,
  state: string,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): Promise<boolean> {
  const parts = state.split('.')
  if (parts.length !== 3) return false
  const [nonce, timestamp, signature] = parts as [string, string, string]
  const expectedSignature = await hmacSign(secret, `${nonce}.${timestamp}`)
  if (!timingSafeEqual(signature, expectedSignature)) return false
  const age = Date.now() - Number(timestamp)
  return Number.isFinite(age) && age >= 0 && age <= maxAgeMs
}
