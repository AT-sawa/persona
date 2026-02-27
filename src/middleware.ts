import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/onboarding"];

// Known bad bots / scrapers (user-agent substrings)
const BLOCKED_BOTS = [
  "CCBot",
  "GPTBot",
  "ChatGPT-User",
  "anthropic-ai",
  "ClaudeBot",
  "Google-Extended",
  "Bytespider",
  "PetalBot",
  "Scrapy",
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "magpie-crawler",
];

// Simple in-memory rate limiter for /api routes
const apiHits = new Map<string, { count: number; resetAt: number }>();
const API_RATE_LIMIT = 20; // requests per window
const API_RATE_WINDOW = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = apiHits.get(ip);
  if (!entry || now > entry.resetAt) {
    apiHits.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > API_RATE_LIMIT;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") || "";

  // --- Bot blocking ---
  if (BLOCKED_BOTS.some((bot) => ua.includes(bot))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // --- API rate limiting ---
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
  }

  // --- Auth: Supabase session refresh + route protection ---
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip auth checks if Supabase is not configured
  if (!supabaseUrl || !supabaseKey) return supabaseResponse;

  const isProtected = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthPage = pathname === "/auth/login";

  // Only run Supabase session check for protected/auth routes
  if (isProtected || isAuthPage) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isProtected && !user) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isAuthPage && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/auth/login",
    "/api/:path*",
    // Match all pages for bot blocking (exclude static assets)
    "/((?!_next/static|_next/image|favicon.ico|images/).*)",
  ],
};
