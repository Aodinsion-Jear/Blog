import Link from "next/link";
import { HeaderActions } from "@/components/HeaderActions";
import { getAllCategories, getAllPosts } from "@/lib/posts";
import type { SearchIndexPost } from "@/lib/search";

export async function Header() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);
  const searchIndex: SearchIndexPost[] = posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    date: post.date,
    category: post.category,
    tags: post.tags,
    searchText: post.searchText,
  }));

  return (
    <header className="border-b border-warm-border/80">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-4 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className="group inline-flex flex-col gap-1">
          <span className="font-serif text-2xl font-bold tracking-[-0.01em] text-warm-foreground group-hover:text-warm-accent">
            README
          </span>
          <span className="text-xs text-warm-muted">技术、设计与日常思考</span>
        </Link>
        <HeaderActions categories={categories} searchIndex={searchIndex} />
      </div>
    </header>
  );
}
