export interface SecretMeta {
  name: string
  type: string
}

interface CfResult<T> {
  success: boolean
  result: T
  errors: unknown[]
}

export interface CloudflareCredentials {
  accountId: string
  apiToken: string
}

export function requireCloudflareCredentials(): CloudflareCredentials {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set')
  }
  return { accountId, apiToken }
}

export async function listSecrets(credentials: CloudflareCredentials, scriptName: string): Promise<SecretMeta[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/workers/scripts/${scriptName}/secrets`,
    { headers: { Authorization: `Bearer ${credentials.apiToken}` } }
  )
  if (!response.ok) {
    throw new Error(`Cloudflare API returned ${response.status}: ${await response.text()}`)
  }
  const body = (await response.json()) as CfResult<SecretMeta[]>
  if (!body.success) {
    throw new Error(`Failed to list secrets: ${JSON.stringify(body.errors)}`)
  }
  return body.result
}

export async function putSecret(
  credentials: CloudflareCredentials,
  scriptName: string,
  name: string,
  text: string
): Promise<{ success: boolean; errorText?: string }> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${credentials.accountId}/workers/scripts/${scriptName}/secrets`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${credentials.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, text, type: 'secret_text' }),
    }
  )
  if (response.ok) return { success: true }
  return { success: false, errorText: await response.text() }
}
