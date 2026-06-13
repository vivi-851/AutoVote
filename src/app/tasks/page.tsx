import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import SettingsControl from "@/components/SettingsControl";
import TasksPanel from "@/components/TasksPanel";
import { getProfile } from "@/lib/auth";
import { supabaseEnabled } from "@/lib/supabase/env";
import { getServerT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { t } = await getServerT();
  const profile = await getProfile();

  return (
    <main className="min-h-full bg-background">
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-900/80 border-b border-black/5 dark:border-white/10">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm flex items-center gap-1"
          >
            <span className="text-lg leading-none">‹</span> {t("返回")}
          </Link>
          <span className="font-semibold text-gray-800 dark:text-gray-100">🎁 {t("每日任务")}</span>
          <div className="ml-auto flex items-center gap-1">
            <SettingsControl />
            <AuthButton profile={profile} enabled={supabaseEnabled} />
          </div>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 py-5">
        {!supabaseEnabled ? (
          <div className="text-center text-gray-400 py-20 text-sm">
            {t("账户系统待接入 Supabase 后开放")}
          </div>
        ) : !profile ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t("登录后赚积分、做任务、冲榜")}
            </p>
            <AuthButton profile={null} enabled={supabaseEnabled} />
          </div>
        ) : (
          <TasksPanel />
        )}
      </div>
    </main>
  );
}
