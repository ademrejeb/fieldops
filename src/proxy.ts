import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Public: /login, NextAuth endpoints, mobile API (Bearer), ingest (tracker keys),
  // AI agent context (shared secret / session-gated route handlers),
  // and the health probe. Next internals (_next, __nextjs) must bypass or dev HMR
  // breaks (the dev client would be redirected to /login and reload in a loop).
  matcher: [
    "/((?!api/auth|api/mobile|api/ingest|api/health|api/agents|_next|__nextjs|login|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
