"use client";

// 阅读奖励（详情页隐形组件）：登录用户在详情页停留 ≥8s 触发一次。
// 走 claim_read_reward RPC（rewards.sql）：每天前 3 篇、每篇 +10、按盘口去重。
// 服务端做幂等与封顶，这里只负责「停留够久就尝试领」并提示。

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

const DWELL_MS = 8000;

function localDate(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function ReadReward({
  marketId,
  loggedIn,
}: {
  marketId: string;
  loggedIn: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!loggedIn || !marketId) return;
    let fired = false;
    const timer = setTimeout(async () => {
      if (fired || document.visibilityState !== "visible") return;
      fired = true;
      const sb = createClient();
      if (!sb) return;
      const { data } = await sb.rpc("claim_read_reward", {
        p_market_id: marketId,
        p_local_date: localDate(),
      });
      if (data?.claimed) {
        setToast(`📖 ${t("阅读奖励")} +${data.reward}`);
        router.refresh(); // 刷新顶部余额
        setTimeout(() => setToast(null), 2400);
      }
    }, DWELL_MS);
    return () => clearTimeout(timer);
  }, [marketId, loggedIn, router, t]);

  if (!toast) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-500 text-white text-sm font-medium px-4 py-2 shadow-lg">
      {toast}
    </div>
  );
}
