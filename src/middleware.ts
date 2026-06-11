import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseEnabled } from "@/lib/supabase/env";

const ANON_COOKIE = "av_anon";
const ANON_MAXAGE = 60 * 60 * 24 * 365; // 1 年

// 给响应补一个匿名访客 id（埋点 anon_id）：贯穿登录前后、跨会话。
function ensureAnonCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(ANON_COOKIE)?.value) return;
  response.cookies.set(ANON_COOKIE, crypto.randomUUID(), {
    maxAge: ANON_MAXAGE,
    path: "/",
    sameSite: "lax",
    // 不设 httpOnly：客户端埋点需要读取
  });
}

// 刷新 Supabase 会话 cookie。未配置密钥时直接放行（不影响信息流）。
export async function middleware(request: NextRequest) {
  if (!supabaseEnabled) {
    const res = NextResponse.next();
    ensureAnonCookie(request, res);
    return res;
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();
  ensureAnonCookie(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
