import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { markdownToHtmlWithToc } from "@/lib/markdown";
import { PostContent } from "@/components/PostContent";
import { formatDate, getAllPosts, getPostBySlug } from "@/lib/posts";

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "文章未找到",
    };
  }

  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const { contentHtml, toc } = await markdownToHtmlWithToc(post.content);

  return (
    <article className="mx-auto max-w-[1080px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-[760px] lg:mx-0">
        <Link className="text-sm text-warm-muted transition hover:text-warm-accent" href="/">
          ← 返回首页
        </Link>

        <header className="mt-10 border-b border-warm-border pb-8">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-warm-muted">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <Link
              href={`/categories/${encodeURIComponent(post.category)}`}
              className="rounded-[6px] border border-warm-border px-2 py-1 transition hover:border-warm-accent/50 hover:text-warm-accent"
            >
              {post.category}
            </Link>
          </div>
          <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-warm-foreground sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-6 text-base leading-8 text-warm-muted sm:text-lg">{post.summary}</p>
          {post.tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  className="rounded-[6px] border border-warm-border/80 px-2 py-1 text-xs text-warm-muted"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </header>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,760px)_220px] lg:items-start">
        <PostContent html={contentHtml} />

        {toc.length > 0 ? (
          <aside className="order-first rounded-card border border-warm-border bg-warm-surface/60 p-4 lg:sticky lg:top-8 lg:order-none">
            <h2 className="font-serif text-sm font-semibold text-warm-foreground">目录</h2>
            <nav className="mt-3 grid gap-2 text-sm text-warm-muted">
              {toc.map((item) => (
                <a
                  className={`transition hover:text-warm-accent ${item.depth === 3 ? "pl-4" : ""}`}
                  href={`#${item.id}`}
                  key={item.id}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
