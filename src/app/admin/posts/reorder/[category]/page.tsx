import Link from "next/link";
import { notFound } from "next/navigation";
import { ReorderList } from "./ReorderList";
import { getAllPosts, formatDate } from "@/lib/posts";

type Props = { params: Promise<{ category: string }> };

export default async function ReorderPage({ params }: Props) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const posts = await getAllPosts();
  const list = posts
    .filter((p) => p.category === decoded)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      date: p.date ? formatDate(p.date) : "",
      order: typeof p.order === "number" ? p.order : null,
    }));

  if (list.length === 0) {
    notFound();
  }

  return (
    <div className="grid gap-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-warm-accentDark">Reorder</p>
          <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">
            排序：{decoded}
          </h1>
          <p className="mt-3 text-sm text-warm-muted">
            拖拽调整顺序，保存后会写回每篇文章的 frontmatter.order 字段。order 越小越靠前。
          </p>
        </div>
        <Link
          href="/admin/posts"
          className="rounded-[6px] border border-warm-border px-3 py-1.5 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
        >
          返回列表
        </Link>
      </header>
      <ReorderList category={decoded} initial={list} />
    </div>
  );
}
