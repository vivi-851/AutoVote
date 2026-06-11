import { cookies } from "next/headers";
import { translate, type Lang } from "./i18n-dict";

// 服务端组件用：从 cookie 读当前语言，返回 t()
export async function getServerT() {
  const lang = (((await cookies()).get("lang")?.value as Lang) || "zh") as Lang;
  const t = (zh: string) => translate(zh, lang);
  return { lang, t };
}
