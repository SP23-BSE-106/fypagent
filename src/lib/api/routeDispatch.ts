import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Context handed to a catch-all route by Next. `path` is the matched segment
 * list, so `/api/auth/login` dispatches on `['login']`.
 */
export interface DispatchContext {
  params: Promise<{ path?: string[] }>
}

export function notFound(): Response {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export function methodNotAllowed(): Response {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

type Handler = (request: NextRequest, ctx?: unknown) => Promise<Response> | Response

/**
 * Route one catch-all segment to the handler module registered for it.
 *
 * Why this exists: Vercel's Hobby plan caps a deployment at 12 Serverless
 * Functions and every `route.ts` compiles to its own function. Routing the
 * related handlers through a single `[[...path]]` entry collapses the count
 * while leaving each public URL byte-identical, so no client code changes.
 *
 * Method resolution matches plain Next routes: an unregistered path is a 404,
 * a registered path without that method is a 405.
 */
export async function dispatch(
  table: object,
  method: string,
  request: NextRequest,
  ctx: DispatchContext,
): Promise<Response> {
  const { path = [] } = await ctx.params

  const routes = table as Record<string, Record<string, unknown>>
  const handlers = routes[path.join('/')]
  if (!handlers) return notFound()

  const handler = handlers[method] as Handler | undefined
  if (typeof handler !== 'function') return methodNotAllowed()

  return await handler(request, { params: Promise.resolve({ path }) })
}
