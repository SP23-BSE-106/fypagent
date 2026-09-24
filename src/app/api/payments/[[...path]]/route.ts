import type { NextRequest } from 'next/server'

import { dispatch, type DispatchContext } from '@/lib/api/routeDispatch'

import * as checkout from '../checkout/handler'
import * as local from '../local/handler'
import * as verifySession from '../verify-session/handler'
import * as webhook from '../webhook/handler'

/** `webhook` is hit by Stripe, so its path and raw-body handling stay as-is. */
const routes = {
  checkout,
  local,
  'verify-session': verifySession,
  webhook,
}

function handle(method: string) {
  return (request: NextRequest, ctx: DispatchContext) =>
    dispatch(routes, method, request, ctx)
}

export const GET = handle('GET')
export const POST = handle('POST')
export const PUT = handle('PUT')
export const PATCH = handle('PATCH')
export const DELETE = handle('DELETE')
