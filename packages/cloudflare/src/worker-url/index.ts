export function requireWorkersSubdomain(): string {
  const subdomain = process.env.CLOUDFLARE_WORKERS_SUBDOMAIN
  if (!subdomain) {
    throw new Error('CLOUDFLARE_WORKERS_SUBDOMAIN must be set')
  }
  return subdomain
}

export function getWorkerUrl(workerName: string, subdomain: string): string {
  return `https://${workerName}.${subdomain}.workers.dev`
}
