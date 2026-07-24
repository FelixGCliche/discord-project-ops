export function buildAuthorizeUrl(redirectUri: string, token: string): string {
  const url = new URL('/github/oauth/authorize', redirectUri)
  url.searchParams.set('token', token)
  return url.toString()
}

export function buildInstallUrl(appSlug: string, state: string): string {
  return `https://github.com/apps/${appSlug}/installations/new?state=${encodeURIComponent(state)}`
}
