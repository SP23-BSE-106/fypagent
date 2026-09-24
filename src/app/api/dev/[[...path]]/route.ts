import type { NextRequest } from 'next/server'

import { dispatch, type DispatchContext } from '@/lib/api/routeDispatch'

import * as initCollections from '../init-collections/handler'

const routes = {
  'init-collections': initCollections,
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
