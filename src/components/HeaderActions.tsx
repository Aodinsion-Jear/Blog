"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { SearchBox } from "@/components/SearchBox";
import type { Category } from "@/lib/posts";
import type { SearchIndexPost } from "@/lib/search";

type HeaderActionsProps = {
  categories: Category[];
  searchIndex: SearchIndexPost[];
};

const navBaseClass =
  "rounded-full border border-transparent px-3 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/30";
const navInactiveClass =
  "text-warm-muted hover:border-warm-accent/40 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark";
const navActiveClass =
  "border-warm-accent/45 bg-warm-accentSoft/35 text-warm-accentDark shadow-[0_1px_2px_rgba(168,95,69,0.12)]";

function navClass(isActive = false) {
  return `${navBaseClass} ${isActive ? navActiveClass : navInactiveClass}`;
}

function getCategoryFromPathname(pathname: string) {
  if (!pathname.startsWith("/categories/")) return undefined;
  const encodedCategory = pathname.split("/")[2];
  if (!encodedCategory) return undefined;

  try {
    return decodeURIComponent(encodedCategory);
  } catch {
    return encodedCategory;
  }
}

export function HeaderActions({ categories, searchIndex }: HeaderActionsProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const currentCategory = getCategoryFromPathname(pathname);

  useEffect(() => {
    if (!isSearchOpen && !isCategoryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setIsCategoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, isCategoryOpen]);

  useEffect(() => {
    if (!isCategoryOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        categoryMenuRef.current &&
        event.target instanceof Node &&
        !categoryMenuRef.current.contains(event.target)
      ) {
        setIsCategoryOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCategoryOpen]);

  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link className={navClass(pathname === "/")} href="/">
        首页
      </Link>

      <div className="relative" ref={categoryMenuRef}>
        <button
          aria-expanded={isCategoryOpen}
          aria-haspopup="menu"
          className={navClass(isCategoryOpen || pathname.startsWith("/categories/"))}
          onClick={() => setIsCategoryOpen((open) => !open)}
          type="button"
        >
          分类
        </button>
        {isCategoryOpen ? (
          <div
            className="absolute right-0 top-full z-40 mt-3 min-w-44 overflow-hidden rounded-card border border-warm-border bg-warm-surface py-2 text-warm-foreground shadow-lg"
            role="menu"
          >
            <Link
              className="flex items-center justify-between gap-4 px-4 py-2 text-sm transition hover:bg-warm-accentSoft/30 hover:text-warm-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/30"
              href="/"
              onClick={() => setIsCategoryOpen(false)}
              role="menuitem"
            >
              <span>全部</span>
            </Link>
            {categories.map((category) => (
              <Link
                className="flex items-center justify-between gap-4 px-4 py-2 text-sm transition hover:bg-warm-accentSoft/30 hover:text-warm-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/30"
                href={`/categories/${encodeURIComponent(category.name)}`}
                key={category.name}
                onClick={() => setIsCategoryOpen(false)}
                role="menuitem"
              >
                <span>{category.name}</span>
                <span className="rounded-full bg-warm-accentSoft/40 px-2 py-0.5 text-xs font-semibold text-warm-accentDark">
                  {category.count}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <button className={navClass(isSearchOpen)} onClick={() => setIsSearchOpen(true)} type="button">
        搜索
      </button>

      {isSearchOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
          role="dialog"
        >
          <div
            className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-card border border-warm-border bg-warm-surface p-6 text-left shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-warm-accentDark">Search</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.03em] text-warm-foreground">
                  搜索文章
                </h2>
              </div>
              <button
                aria-label="关闭搜索"
                className="rounded-full border border-warm-border px-3 py-1 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accentDark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warm-accent/30"
                onClick={() => setIsSearchOpen(false)}
                type="button"
              >
                关闭
              </button>
            </div>
            <Suspense>
              <SearchBox
                autoFocus
                onResultClick={() => setIsSearchOpen(false)}
                onSubmitted={() => setIsSearchOpen(false)}
                posts={searchIndex}
                scopeCategory={currentCategory}
              />
            </Suspense>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
