import Link from "next/link";
import { PostCategoryBoard } from "./PostCategoryBoard";
import { getAllPosts, getAllCategories, formatDate } from "@/lib/posts";

export default async function AdminPostsPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-warm-accentDark">Posts</p>
          <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">文章管理</h1>
          <p className="mt-3 text-sm text-warm-muted">
            按分类查看，拖拽文章可在分类内排序，也可以移动到其他分类。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/posts/upload"
            className="rounded-[6px] border border-warm-border px-4 py-2 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
          >
            上传 .md
          </Link>
          <Link
            href="/admin/posts/new"
            className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark"
          >
            新建文章
          </Link>
        </div>
      </header>

      <PostCategoryBoard
        categories={categories.map((category) => ({ name: category.name }))}
        posts={posts.map((post) => ({
          slug: post.slug,
          title: post.title,
          date: post.date,
          formattedDate: post.date ? formatDate(post.date) : "",
          category: post.category,
          order: typeof post.order === "number" ? post.order : null,
        }))}
      />
    </div>
  );
}
