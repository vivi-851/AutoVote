"use client";

import { useState } from "react";
import { useTheme, type Theme } from "@/lib/theme";
import { useT, LANGS, type Lang } from "@/lib/i18n";

// 太阳/月亮/显示器 三档图标
function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === "light")
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
      </svg>
    );
  if (theme === "dark")
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

export default function SettingsControl() {
  const { theme, setTheme } = useTheme();
  const { lang, setLang, t } = useT();
  const [open, setOpen] = useState(false);

  const cycleTheme = () => {
    const order: Theme[] = ["light", "dark", "system"];
    setTheme(order[(order.indexOf(theme) + 1) % 3]);
  };
  const themeLabel = theme === "light" ? t("浅色") : theme === "dark" ? t("深色") : t("跟随系统");

  return (
    <div className="flex items-center gap-1">
      {/* 主题切换 */}
      <button
        onClick={cycleTheme}
        title={`${t("主题")}: ${themeLabel}`}
        className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition"
      >
        <ThemeIcon theme={theme} />
      </button>

      {/* 语言切换 */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          title={t("语言")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[1.8]">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9z" />
          </svg>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 mt-2 w-32 rounded-xl bg-white dark:bg-gray-800 ring-1 ring-black/10 dark:ring-white/10 shadow-lg py-1 z-20">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code as Lang);
                    setOpen(false);
                  }}
                  className={`block w-full text-left px-3 py-1.5 text-[13px] hover:bg-black/5 dark:hover:bg-white/10 ${
                    lang === l.code ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
