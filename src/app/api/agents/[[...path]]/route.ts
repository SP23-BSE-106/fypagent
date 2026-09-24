import type { NextRequest } from 'next/server'

import { methodNotAllowed, notFound, type DispatchContext } from '@/lib/api/routeDispatch'

import * as generate from '../generate/handler'
import * as root from '../handler'
import * as byId from '../[id]/handler'

type Handler = (request: NextRequest, ctx?: unknown) => Promise<Response> | Response

/**
 * Three shapes live under one prefix, resolved here in Next's own precedence
 * order (static segments beat dynamic ones):
 *
 *   /api/agents            -> root        (GET, POST)
 *   /api/agents/generate   -> generate    (POST)
 *   /api/agents/{id}       -> byId        (GET, DELETE, PATCH)
 *
 * `byId` is the only handler in the app that reads `params`, so its context is
 * rebuilt as `{ id }` rather than the catch-all's `{ path }`.
 */
async function run(
  method: string,
  request: NextRequest,
  ctx: DispatchContext,
): Promise<Response> {
  const { path = [] } = await ctx.params

  let mod: object
  let handlerCtx: unknown = { params: Promise.resolve({ path }) }

  if (path.length === 0) {
    mod = root
  } else if (path.length === 1 && path[0] === 'generate') {
    mod = generate
  } else if (path.length === 1) {
    mod = byId
    handlerCtx = { params: Promise.resolve({ id: path[0] }) }
  } else {
    return notFound()
  }

  const handler = (mod as Record<string, unknown>)[method] as Handler | undefined
  if (typeof handler !== 'function') return methodNotAllowed()

  return await handler(request, handlerCtx)
}

export function GET(request: NextRequest, ctx: DispatchContext) {
  return run('GET', request, ctx)
}

export function POST(request: NextRequest, ctx: DispatchContext) {
  return run('POST', request, ctx)
}

export function PUT(request: NextRequest, ctx: DispatchContext) {
  return run('PUT', request, ctx)
}

export function PATCH(request: NextRequest, ctx: DispatchContext) {
  return run('PATCH', request, ctx)
}

export function DELETE(request: NextRequest, ctx: DispatchContext) {
  return run('DELETE', request, ctx)
}
