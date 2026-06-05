import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { getCurrentCommit, getLatestCommit } from "@/lib/updater";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const current = getCurrentCommit();
  const latest = await getLatestCommit();
  const hasUpdate = Boolean(current && latest && current !== latest);

  return (
    <div className="min-h-screen bg-warm-background text-warm-foreground">
      <div className="mx-auto flex max-w-[1280px] gap-8 px-5 py-8 sm:px-8">
        <aside className="hidden w-52 shrink-0 sm:block">
          <div className="sticky top-8 grid gap-1">
            <Link
              href="/"
              className="mb-4 inline-block text-xs uppercase tracking-widest text-warm-accentDark"
            >
              ← 回到博客
            </Link>
            <p className="mb-2 text-xs uppercase tracking-widest text-warm-muted">管理</p>
            <NavLink href="/admin">仪表盘</NavLink>
            <NavLink href="/admin/categories">分类</NavLink>
            <NavLink href="/admin/posts">文章</NavLink>
            <NavLink href="/admin/posts/upload">上传</NavLink>
            <NavLink href="/admin/update" badge={hasUpdate}>系统更新</NavLink>
            <div className="mt-6 border-t border-warm-border pt-4">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  children,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  badge?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[6px] px-3 py-2 text-sm text-warm-foreground transition hover:bg-warm-accentSoft/35 hover:text-warm-accentDark"
    >
      <span>{children}</span>
      {badge ? (
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-warm-accent"
          title="有新版本可更新"
          aria-label="有新版本可更新"
        />
      ) : null}
    </Link>
  );
}
