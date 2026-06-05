import Link from "next/link";
import { getAllPosts, getAllCategories } from "@/lib/posts";

export default async function AdminDashboardPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">Dashboard</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">总览</h1>
        <p className="mt-3 text-sm text-warm-muted">
          共有 {categories.length} 个分类，{posts.length} 篇文章。
        </p>
      </header>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">分类</h2>
          <div className="flex gap-2 text-sm">
            <Link
              href="/admin/categories"
              className="rounded-[6px] border border-warm-border px-3 py-1.5 text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
            >
              管理
            </Link>
            <Link
              href="/admin/posts/upload"
              className="rounded-[6px] bg-warm-accent px-3 py-1.5 text-warm-surface transition hover:bg-warm-accentDark"
            >
              上传文章
            </Link>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={`/admin/posts/reorder/${encodeURIComponent(c.name)}`}
              className="rounded-card border border-warm-border bg-warm-surface p-4 transition hover:border-warm-accent/50 hover:shadow-sm"
            >
              <p className="font-serif text-lg font-semibold">{c.name}</p>
              <p className="mt-1 text-xs text-warm-muted">{c.count} 篇文章 · 点击排序</p>
            </Link>
          ))}
          {categories.length === 0 ? (
            <p className="text-sm text-warm-muted">暂无分类，先去新建一个。</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
