import { Pagination } from "@/components/Pagination";
import { PostList } from "@/components/PostList";
import { getAllPosts, searchPosts } from "@/lib/posts";

const POSTS_PER_PAGE = 10;

type HomePageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
  }>;
};

function parsePage(value?: string) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const query = params?.q ?? "";
  const requestedPage = parsePage(params?.page);
  const posts = await getAllPosts();
  const publishedPosts = [...posts].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    if (dateOrder !== 0) return dateOrder;
    return a.slug.localeCompare(b.slug) || a.title.localeCompare(b.title);
  });
  const visiblePosts = searchPosts(publishedPosts, query);
  const totalPages = Math.max(1, Math.ceil(visiblePosts.length / POSTS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const start = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = visiblePosts.slice(start, start + POSTS_PER_PAGE);

  return (
    <div className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      <section className="max-w-3xl">
        <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-warm-foreground sm:text-5xl">
          永远期待美好的事情即将发生！
        </h1>
      </section>

      <section className="mt-10">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-[-0.03em] text-warm-foreground">
              最新文章
            </h2>
            <p className="mt-2 text-sm text-warm-muted">
              {query ? `搜索“${query}”找到 ${visiblePosts.length} 篇文章` : `共 ${posts.length} 篇文章`}
              {totalPages > 1 ? `，当前第 ${currentPage} / ${totalPages} 页` : ""}
            </p>
          </div>
        </div>
        <PostList posts={paginatedPosts} emptyMessage="没有找到匹配的文章，换个关键词试试。" />
        <Pagination currentPage={currentPage} query={query} totalPages={totalPages} />
      </section>
    </div>
  );
}
