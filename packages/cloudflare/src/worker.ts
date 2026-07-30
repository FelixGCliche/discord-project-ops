import { HttpError } from 'core'

export type RouteHandlers<TEnv> = Record<string, (request: Request, env: TEnv) => Promise<Response>>

export function createWorkerFetch<TEnv>(routes: RouteHandlers<TEnv>) {
  return async (request: Request, env: TEnv): Promise<Response> => {
    const url = new URL(request.url)
    const handler = routes[url.pathname]
    if (!handler) return new Response('Not found', { status: 404 })
    try {
      return await handler(request, env)
    } catch (error) {
      console.error(error)
      if (error instanceof HttpError) {
        return new Response(error.message, { status: error.status })
      }
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}
