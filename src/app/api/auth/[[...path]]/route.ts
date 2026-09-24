import type { NextRequest } from 'next/server'

import { dispatch, type DispatchContext } from '@/lib/api/routeDispatch'

import * as changePassword from '../change-password/handler'
import * as forgotPassword from '../forgot-password/handler'
import * as googleCallback from '../google/callback/handler'
import * as googleStart from '../google/start/handler'
import * as login from '../login/handler'
import * as logout from '../logout/handler'
import * as me from '../me/handler'
import * as profile from '../profile/handler'
import * as resetPassword from '../reset-password/handler'
import * as signup from '../signup/handler'
import * as verifyEmail from '../verify-email/handler'

/**
 * `GET /api/auth/google/callback` is the registered OAuth redirect URI and
 * `GET /api/auth/verify-email` is linked from outgoing emails, so every path
 * below must keep resolving exactly as before.
 */
const routes = {
  'change-password': changePassword,
  'forgot-password': forgotPassword,
  'google/callback': googleCallback,
  'google/start': googleStart,
  login,
  logout,
  me,
  profile,
  'reset-password': resetPassword,
  signup,
  'verify-email': verifyEmail,
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
