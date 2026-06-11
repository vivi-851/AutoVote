"use client";

// 客户端埋点：把行为事件写进 Supabase public.events（fire-and-forget）。
// - 身份：anon_id 读 cookie（middleware 写入），session_id 读/造 sessionStorage，
//   user_id 由数据库触发器按服务端会话写入（客户端不传、也无法伪造）。
// - 曝光（feed_impression）高频：每会话每卡去重 + 批量上报；离开页面时 flush。
// - 未配置 Supabase 时静默 no-op。

import { createClient } from "@/lib/supabase/client";

export interface TrackFields {
  market_id?: string | null;
  market_kind?: string | null;
  source?: string | null;
  position?: number | null;
  props?: Record<string, unknown>;
}

function cookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function sessionId(): string {
  if (typeof window === "undefined") return "";
  let s = sessionStorage.getItem("av_session");
  if (!s) {
    s = crypto.randomUUID();
    sessionStorage.setItem("av_session", s);
  }
  return s;
}

function row(event_type: string, f: TrackFields) {
  return {
    event_type,
    anon_id: cookie("av_anon"),
    session_id: sessionId(),
    market_id: f.market_id ?? null,
    market_kind: f.market_kind ?? null,
    source: f.source ?? null,
    position: f.position ?? null,
    props: f.props ?? {},
    path: typeof location !== "undefined" ? location.pathname : null,
  };
}

// 离散事件：立即上报
export function track(event_type: string, f: TrackFields = {}) {
  const supabase = createClient();
  if (!supabase) return;
  void supabase
    .from("events")
    .insert(row(event_type, f))
    .then(({ error }) => {
      if (error) console.debug("track failed", event_type, error.message);
    });
}

// ── 曝光：去重 + 批量 ──────────────────────────────
const seen = new Set<string>();
let buffer: ReturnType<typeof row>[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

export function trackImpression(f: TrackFields) {
  const key = `${sessionId()}:${f.market_id ?? f.position}`;
  if (seen.has(key)) return;
  seen.add(key);
  buffer.push(row("feed_impression", f));
  if (!timer) timer = setTimeout(flush, 4000);
}

export function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  const supabase = createClient();
  if (!supabase) return;
  void supabase
    .from("events")
    .insert(batch)
    .then(({ error }) => {
      if (error) console.debug("impression flush failed", error.message);
    });
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
  window.addEventListener("pagehide", flush);
}
