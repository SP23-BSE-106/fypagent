import type { NextRequest } from 'next/server'

import { dispatch, type DispatchContext } from '@/lib/api/routeDispatch'

import * as apiKeys from '../api-keys/handler'

const routes = {
  'api-keys': apiKeys,
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
