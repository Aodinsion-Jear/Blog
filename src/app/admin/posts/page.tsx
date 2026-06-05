import Link from "next/link";
import { getAllPosts, getAllCategories, formatDate } from "@/lib/posts";
import { DeletePostButton } from "@/components/admin/DeletePostButton";

export default async function AdminPostsPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-warm-accentDark">Posts</p>
          <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">文章管理</h1>
          <p className="mt-3 text-sm text-warm-muted">按分类查看，进入排序页可拖拽调整顺序。</p>
        </div>
        <Link
          href="/admin/posts/upload"
          className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark"
        >
          上传文章
        </Link>
      </header>

      <div className="grid gap-6">
        {categories.map((c) => {
          const inCategory = posts.filter((p) => p.category === c.name);
          return (
            <section key={c.name} className="rounded-card border border-warm-border bg-warm-surface">
              <div className="flex items-center justify-between border-b border-warm-border px-5 py-3">
                <div>
                  <h2 className="font-serif text-lg font-semibold">{c.name}</h2>
                  <p className="text-xs text-warm-muted">{inCategory.length} 篇</p>
                </div>
                {inCategory.length > 1 ? (
                  <Link
                    href={`/admin/posts/reorder/${encodeURIComponent(c.name)}`}
                    className="rounded-[6px] border border-warm-border px-3 py-1.5 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
                  >
                    排序
                  </Link>
                ) : null}
              </div>
              {inCategory.length === 0 ? (
                <p className="px-5 py-6 text-sm text-warm-muted">这个分类下还没有文章。</p>
              ) : (
                <ul className="divide-y divide-warm-border">
                  {inCategory.map((post) => (
                    <li key={post.slug} className="flex items-center gap-4 px-5 py-3 text-sm">
                      <span className="w-10 shrink-0 text-xs text-warm-muted">
                        #{typeof post.order === "number" ? post.order : "—"}
                      </span>
                      <Link
                        href={`/posts/${post.slug}`}
                        target="_blank"
                        className="flex-1 truncate font-medium text-warm-foreground transition hover:text-warm-accent"
                      >
                        {post.title}
                      </Link>
                      <span className="hidden text-xs text-warm-muted sm:inline">
                        {post.date ? formatDate(post.date) : ""}
                      </span>
                      <code className="hidden text-xs text-warm-muted md:inline">{post.slug}</code>
                      <DeletePostButton slug={post.slug} title={post.title} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
