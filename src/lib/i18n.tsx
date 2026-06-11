"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { translate, type Lang } from "./i18n-dict";

export { LANGS, type Lang } from "./i18n-dict";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (zh: string) => string;
}
const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [lang, setLangState] = useState<Lang>("zh");

  useEffect(() => {
    const saved = (localStorage.getItem("lang") as Lang) || null;
    if (saved && saved !== "zh") setLangState(saved);
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      localStorage.setItem("lang", l);
      document.documentElement.lang = l;
      // cookie 让服务端组件也能读到当前语言；refresh 让其按新语言重渲染
      document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const t = useCallback((zh: string) => translate(zh, lang), [lang]);

  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export function useT() {
  const ctx = useContext(LangCtx);
  if (!ctx) return { lang: "zh" as Lang, setLang: () => {}, t: (s: string) => s };
  return ctx;
}
