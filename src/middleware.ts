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

// ── Vulnerability scan paths to block ──────────────────────────────────
const BLOCKED_PATHS = [
  "/.env",
  "/.env.local",
  "/.env.production",
  "/.env.backup",
  "/.git",
  "/.git/config",
  "/.gitignore",
  "/wp-admin",
  "/wp-login.php",
  "/wp-content",
  "/wp-includes",
  "/xmlrpc.php",
  "/administrator",
  "/phpmyadmin",
  "/phpinfo.php",
  "/.htaccess",
  "/.htpasswd",
  "/server-status",
  "/server-info",
  "/cgi-bin",
  "/config.php",
  "/web.config",
  "/.aws/credentials",
  "/.docker",
  "/docker-compose.yml",
];

// ── SQL injection detection patterns ───────────────────────────────────
const SQL_INJECTION_PATTERNS = [
  /(\b|');\s*DROP\s/i,
  /(\b|');\s*DELETE\s/i,
  /(\b|');\s*INSERT\s/i,
  /(\b|');\s*UPDATE\s.*SET\s/i,
  /UNION\s+(ALL\s+)?SELECT/i,
  /OR\s+1\s*=\s*1/i,
  /OR\s+'1'\s*=\s*'1'/i,
  /'\s*OR\s+'.*'\s*=\s*'/i,
  /;\s*EXEC(\s|UTE)/i,
  /\/\*.*\*\//,
  /xp_cmdshell/i,
  /WAITFOR\s+DELAY/i,
  /BENCHMARK\s*\(/i,
  /SLEEP\s*\(/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+(OUT|DUMP)FILE/i,
];

// ── Per-endpoint rate limit configuration ──────────────────────────────
interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const ENDPOINT_RATE_LIMITS: { prefix: string; config: RateLimitConfig }[] = [
  // Strictest limits first — order matters for prefix matching
  { prefix: "/api/auth/register", config: { limit: 5, windowMs: 15 * 60_000 } },
  { prefix: "/api/account/delete", config: { limit: 3, windowMs: 15 * 60_000 } },
  { prefix: "/api/cron/matching", config: { limit: 2, windowMs: 60_000 } },
  { prefix: "/api/notify", config: { limit: 10, windowMs: 60_000 } },
];

const DEFAULT_RATE_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60_000 };

// In-memory rate limit store: key = "ip:route-prefix" → hit data
const rateLimitStore = new Map<
  string,
  { count: number; resetAt: number }
>();

// Periodic cleanup every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60_000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const { prefix, config } of ENDPOINT_RATE_LIMITS) {
    if (pathname.startsWith(prefix)) return config;
  }
  return DEFAULT_RATE_LIMIT;
}

function isRateLimited(ip: string, pathname: string): boolean {
  cleanupExpiredEntries();

  const config = getRateLimitConfig(pathname);

  // Determine the bucket key — use the matching prefix so all sub-paths
  // under the same sensitive endpoint share one counter per IP.
  let bucket = "/api/";
  for (const { prefix } of ENDPOINT_RATE_LIMITS) {
    if (pathname.startsWith(prefix)) {
      bucket = prefix;
      break;
    }
  }

  const key = `${ip}:${bucket}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return false;
  }

  entry.count++;
  return entry.count > config.limit;
}

// ── Suspicious query-string detection ──────────────────────────────────
function hasSQLInjection(request: NextRequest): boolean {
  const url = request.nextUrl;
  const searchString = url.search; // raw query string including ?
  if (!searchString) return false;

  // Check the full query string
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(searchString)) return true;
  }

  // Also check each individual parameter value
  for (const [, value] of url.searchParams) {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) return true;
    }
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ua = request.headers.get("user-agent") || "";

  // --- Block common vulnerability scan paths ---
  const lowerPath = pathname.toLowerCase();
  if (BLOCKED_PATHS.some((blocked) => lowerPath.startsWith(blocked))) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // --- Bot blocking ---
  if (BLOCKED_BOTS.some((bot) => ua.includes(bot))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // --- SQL injection blocking ---
  if (hasSQLInjection(request)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // --- API rate limiting (per-endpoint) ---
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    if (isRateLimited(ip, pathname)) {
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
