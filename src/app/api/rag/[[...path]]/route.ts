import type { NextRequest } from 'next/server'

import { dispatch, type DispatchContext } from '@/lib/api/routeDispatch'

import * as chat from '../chat/handler'
import * as query from '../query/handler'
import * as reindex from '../reindex/handler'
import * as status from '../status/handler'
import * as upload from '../upload/handler'

/** `/api/rag/upload` also serves `GET` (list documents) and `DELETE` (clear). */
const routes = {
  chat,
  query,
  reindex,
  status,
  upload,
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
