import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pagination } from "@/components/Pagination";
import { PostList } from "@/components/PostList";
import {
  getAllCategories,
  getAllPosts,
  getPostsByCategory,
  searchPosts,
} from "@/lib/posts";

const POSTS_PER_PAGE = 10;

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
};

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);
  return categories.map((category) => ({
    category: category.name,
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const currentCategory = decodeURIComponent(category);

  return {
    title: `${currentCategory}分类`,
    description: `浏览静水笔记中关于${currentCategory}的文章。`,
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ category }, queryParams] = await Promise.all([params, searchParams]);
  const currentCategory = decodeURIComponent(category);
  const query = queryParams?.q ?? "";
  const requestedPage = parsePage(queryParams?.page);
  const posts = await getAllPosts();
  const categoryPosts = getPostsByCategory(posts, currentCategory);

  if (categoryPosts.length === 0) {
    notFound();
  }

  const visiblePosts = searchPosts(categoryPosts, query);
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = visiblePosts.slice(start, start + POSTS_PER_PAGE);

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      <section className="max-w-3xl">
        <p className="mb-4 text-sm text-warm-accentDark">Category</p>
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-warm-foreground sm:text-5xl">
          {currentCategory}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-warm-muted sm:text-lg">
          这个分类下共有 {categoryPosts.length} 篇文章。你可以继续用关键词缩小范围。
        </p>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="font-serif text-2xl font-semibold tracking-[-0.03em] text-warm-foreground">
            {query ? `搜索结果` : `${currentCategory}文章`}
          </h2>
          <p className="mt-2 text-sm text-warm-muted">
            {query ? `搜索“${query}”找到 ${visiblePosts.length} 篇文章` : `显示 ${visiblePosts.length} 篇文章`}
            {totalPages > 1 ? `，当前第 ${currentPage} / ${totalPages} 页` : ""}
          </p>
        </div>
        <PostList posts={paginatedPosts} emptyMessage="这个分类下没有找到匹配的文章。" />
        <Pagination
          basePath={`/categories/${encodeURIComponent(currentCategory)}`}
          currentPage={currentPage}
          query={query}
          totalPages={totalPages}
        />
      </section>
    </div>
  );
}
