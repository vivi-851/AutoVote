import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// 运营后台导航。后续运营工具加在这里即可。
const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "📊 漏斗看板" },
  // { href: "/admin/markets", label: "🎯 盘口管理" },
  // { href: "/admin/users", label: "👥 用户" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 非管理员一律 404，不暴露后台存在
  if (!(await isAdmin())) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/8 dark:border-white/10 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/admin" className="font-bold text-gray-900 dark:text-gray-100">
            AutoVote <span className="text-gray-400 font-normal">· 运营后台</span>
          </Link>
          <nav className="flex items-center gap-1 ml-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 rounded-lg text-[13px] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="ml-auto text-[13px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            ← 返回前台
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
