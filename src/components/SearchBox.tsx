"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { searchPosts } from "@/lib/search";
import type { FormEvent } from "react";
import type { SearchIndexPost } from "@/lib/search";

type SearchBoxProps = {
  autoFocus?: boolean;
  defaultValue?: string;
  onResultClick?: () => void;
  onSubmitted?: () => void;
  posts?: SearchIndexPost[];
  scopeCategory?: string;
};

function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function getSearchPath(pathname: string) {
  if (pathname === "/" || pathname.startsWith("/categories/")) {
    return pathname;
  }
  return "/";
}

export function SearchBox({
  autoFocus = false,
  defaultValue = "",
  onResultClick,
  onSubmitted,
  posts = [],
  scopeCategory,
}: SearchBoxProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue || searchParams.get("q") || "");
  const trimmedValue = value.trim();

  const scopedPosts = useMemo(() => {
    if (!scopeCategory) return posts;
    return posts.filter((post) => post.category === scopeCategory);
  }, [posts, scopeCategory]);

  const results = useMemo(() => {
    if (!trimmedValue) return [];
    return searchPosts(scopedPosts, trimmedValue);
  }, [scopedPosts, trimmedValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetPath = getSearchPath(pathname);
    const params = targetPath === pathname ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();

    if (trimmedValue) {
      params.set("q", trimmedValue);
    } else {
      params.delete("q");
    }
    params.delete("page");

    const qs = params.toString();
    router.push(qs ? `${targetPath}?${qs}` : targetPath);
    onSubmitted?.();
  };

  return (
    <form className="relative" id="search" onSubmit={handleSubmit}>
      <label className="mb-2 block text-sm text-warm-muted" htmlFor="post-search">
        搜索标题、摘要、正文或分类
      </label>
      <div className="flex gap-2">
        <input
          autoFocus={autoFocus}
          id="post-search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="输入关键词，例如：Markdown、设计、随笔"
          className="min-w-0 flex-1 rounded-card border border-warm-border bg-warm-surface px-4 py-3 text-sm text-warm-foreground outline-none transition placeholder:text-warm-muted/65 focus:border-warm-accent/60 focus-visible:ring-2 focus-visible:ring-warm-accent/20"
          type="search"
        />
        <button
          className="rounded-card border border-warm-border bg-warm-surface px-4 py-3 text-sm font-medium text-warm-foreground transition hover:border-warm-accent/50 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/30"
          type="submit"
        >
          搜索
        </button>
      </div>

      {posts.length > 0 ? (
        <div className="mt-5">
          {!trimmedValue ? (
            <div className="rounded-card border border-dashed border-warm-border px-4 py-5 text-sm text-warm-muted">
              输入关键词后，下方会直接显示匹配文章；按 Enter 可进入完整搜索结果页。
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-[45vh] overflow-y-auto pr-1">
              <p className="mb-3 text-xs text-warm-muted">
                找到 {results.length} 篇匹配文章{scopeCategory ? `（${scopeCategory}）` : ""}
              </p>
              <div className="grid gap-2">
                {results.map((post) => (
                  <Link
                    className="group rounded-card border border-warm-border bg-warm-surface px-4 py-3 transition hover:border-warm-accent/50 hover:bg-warm-accentSoft/30"
                    href={`/posts/${post.slug}`}
                    key={post.slug}
                    onClick={onResultClick}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-warm-muted">
                      <time dateTime={post.date}>{formatDate(post.date)}</time>
                      <span>·</span>
                      <span>{post.category}</span>
                    </div>
                    <h3 className="mt-1 font-serif text-base font-semibold tracking-[-0.02em] text-warm-foreground transition group-hover:text-warm-accentDark">
                      {post.title}
                    </h3>
                    {post.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-warm-muted">
                        {post.summary}
                      </p>
                    ) : null}
                    {post.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span
                            className="rounded-[6px] border border-warm-border/80 px-2 py-0.5 text-xs text-warm-muted"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-warm-border px-4 py-5 text-center text-sm text-warm-muted">
              没有找到匹配的文章，换个关键词试试。
            </div>
          )}
        </div>
      ) : null}
    </form>
  );
}
