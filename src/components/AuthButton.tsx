"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/auth";

export default function AuthButton({
  profile,
  enabled,
}: {
  profile: Profile | null;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function login() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function logout() {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    setOpen(false);
    router.refresh();
  }

  // 未配置 Supabase：显示占位（配置完成后自动变成可用登录）
  if (!enabled) {
    return (
      <span className="text-xs text-gray-300" title="待接入 Supabase">
        登录（待配置）
      </span>
    );
  }

  // 未登录
  if (!profile) {
    return (
      <button
        onClick={login}
        disabled={busy}
        className="flex items-center gap-2 rounded-full bg-gray-900 text-white text-[13px] font-medium px-3.5 py-1.5 hover:bg-gray-700 transition disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4">
          <path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.25 1.3-1 2.4-2.1 3.15v2.6h3.4c2-1.85 3.15-4.55 3.15-7.75 0-.6-.05-1.15-.15-1.7z" opacity=".9"/>
          <path fill="#fff" d="M12 22c2.7 0 4.95-.9 6.6-2.45l-3.4-2.6c-.9.6-2.05.95-3.2.95-2.45 0-4.55-1.65-5.3-3.9H3.2v2.45A10 10 0 0 0 12 22z" opacity=".7"/>
          <path fill="#fff" d="M6.7 13.95a6 6 0 0 1 0-3.9V7.6H3.2a10 10 0 0 0 0 8.8z" opacity=".5"/>
          <path fill="#fff" d="M12 6.15c1.45 0 2.75.5 3.8 1.5l2.85-2.85A10 10 0 0 0 3.2 7.6l3.5 2.45C7.45 7.8 9.55 6.15 12 6.15z" opacity=".7"/>
        </svg>
        Google 登录
      </button>
    );
  }

  // 已登录
  const name = profile.display_name ?? profile.email ?? "我";
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full ring-1 ring-black/10 pl-1 pr-3 py-1 hover:bg-gray-50 transition"
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
        ) : (
          <span className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[11px] font-bold text-gray-600">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="text-[13px] font-semibold text-amber-600 tabular-nums">
          {profile.points.toLocaleString()} 分
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white ring-1 ring-black/10 shadow-lg py-1 z-20 text-[13px]">
          <div className="px-3 py-2 text-gray-500 truncate border-b border-black/5">
            {name}
          </div>
          <Link
            href="/me"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            我的预测
          </Link>
          <button
            onClick={logout}
            className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
