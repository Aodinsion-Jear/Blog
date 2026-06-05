import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(cookie);
  const { pathname } = req.nextUrl;

  if (!session.ok) {
    if (pathname.startsWith("/api/")) {
      return new NextResponse("unauthorized", { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/admin")) {
    const method = req.method.toUpperCase();
    if (method !== "GET" && method !== "HEAD") {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host) {
            return new NextResponse("forbidden", { status: 403 });
          }
        } catch {
          return new NextResponse("forbidden", { status: 403 });
        }
      }
    }
  }

  return NextResponse.next();
}
