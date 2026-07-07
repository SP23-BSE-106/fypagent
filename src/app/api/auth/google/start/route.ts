import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const GOOGLE_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";

function getGoogleRedirectUri(request: NextRequest, envValue?: string) {
  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const origin = forwardedProto && forwardedHost
    ? `${forwardedProto.split(",")[0].trim()}://${forwardedHost.split(",")[0].trim()}`
    : requestUrl.origin;

  return envValue?.trim() || `${origin}/api/auth/google/callback`;
}

export async function GET(request: NextRequest) {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI,
    GOOGLE_SCOPES,
  } = process.env as Record<string, string | undefined>;

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: "Missing Google OAuth environment variables" },
      { status: 500 }
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const scope = GOOGLE_SCOPES || "openid email profile";
  const redirectUri = getGoogleRedirectUri(request, GOOGLE_REDIRECT_URI);

  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");

  // Set state cookie manually on redirect response
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 min
  });

  return res;
}

