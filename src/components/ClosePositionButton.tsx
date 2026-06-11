"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

// 平仓按钮：按当前价卖出持仓、兑现盈亏。二次点击确认。
export default function ClosePositionButton({
  betId,
  price,
  proceeds,
}: {
  betId: string;
  price: number; // 当前价（Polymarket 盘口用；生成盘口后端会用池子价）
  proceeds: number; // 预计到账积分（估算）
}) {
  const router = useRouter();
  const { t } = useT();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function close() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc("sell_bet", {
      p_bet_id: betId,
      p_price: price,
      p_fraction: 1,
    });
    setBusy(false);
    if (error) {
      setErr(t("平仓失败"));
      return;
    }
    router.refresh();
  }

  if (err) return <span className="text-[12px] text-red-500">{err}</span>;

  return armed ? (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={close}
        disabled={busy}
        className="rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[12px] font-medium px-3 py-1 hover:bg-gray-700 dark:hover:bg-white disabled:opacity-60"
      >
        {busy ? t("平仓中…") : `${t("平仓")} ~${proceeds}${t("分")}`}
      </button>
      <button onClick={() => setArmed(false)} className="text-[12px] text-gray-400 dark:text-gray-500">
        {t("取消")}
      </button>
    </span>
  ) : (
    <button
      onClick={() => setArmed(true)}
      className="rounded-lg ring-1 ring-black/15 dark:ring-white/15 text-[12px] font-medium px-3 py-1 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10"
    >
      {t("平仓")}
    </button>
  );
}
