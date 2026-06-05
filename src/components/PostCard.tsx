import Link from "next/link";
import type { Post } from "@/lib/posts";
import { formatDate } from "@/lib/posts";

type PostCardProps = {
  post: Post;
};

export function PostCard({ post }: PostCardProps) {
  return (
    <article className="rounded-card border border-warm-border bg-warm-surface px-5 py-5 transition hover:border-warm-accent/45 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-warm-muted">
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <Link
          href={`/categories/${encodeURIComponent(post.category)}`}
          className="rounded-[6px] border border-warm-border px-2 py-1 transition hover:border-warm-accent/50 hover:text-warm-accent"
        >
          {post.category}
        </Link>
      </div>
      <h2 className="font-serif text-xl font-semibold tracking-[-0.02em] text-warm-foreground sm:text-2xl">
        <Link className="transition hover:text-warm-accent" href={`/posts/${post.slug}`}>
          {post.title}
        </Link>
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-warm-muted sm:text-base">
        {post.summary}
      </p>
      {post.tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
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
    </article>
  );
}
