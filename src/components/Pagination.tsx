import Link from "next/link";

type PaginationProps = {
  basePath?: string;
  currentPage: number;
  query?: string;
  totalPages: number;
};

function buildPageHref(basePath: string, page: number, query?: string) {
  const params = new URLSearchParams();
  const trimmedQuery = query?.trim();

  if (trimmedQuery) {
    params.set("q", trimmedQuery);
  }
  if (page > 1) {
    params.set("page", String(page));
  }

  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination({
  basePath = "/",
  currentPage,
  query,
  totalPages,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="文章分页"
      className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm"
    >
      <Link
        aria-disabled={currentPage <= 1}
        className={`rounded-card border px-4 py-2 transition ${
          currentPage <= 1
            ? "pointer-events-none border-warm-border/60 text-warm-muted/60"
            : "border-warm-border bg-warm-surface text-warm-foreground hover:border-warm-accent/50 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark"
        }`}
        href={buildPageHref(basePath, Math.max(1, currentPage - 1), query)}
      >
        上一页
      </Link>

      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => {
        const isActive = page === currentPage;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={`rounded-card border px-3.5 py-2 transition ${
              isActive
                ? "border-warm-accent bg-warm-accent text-warm-surface shadow-[0_1px_2px_rgba(168,95,69,0.25)]"
                : "border-warm-border bg-warm-surface text-warm-foreground hover:border-warm-accent/50 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark"
            }`}
            href={buildPageHref(basePath, page, query)}
            key={page}
          >
            {page}
          </Link>
        );
      })}

      <Link
        aria-disabled={currentPage >= totalPages}
        className={`rounded-card border px-4 py-2 transition ${
          currentPage >= totalPages
            ? "pointer-events-none border-warm-border/60 text-warm-muted/60"
            : "border-warm-border bg-warm-surface text-warm-foreground hover:border-warm-accent/50 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark"
        }`}
        href={buildPageHref(basePath, Math.min(totalPages, currentPage + 1), query)}
      >
        下一页
      </Link>
    </nav>
  );
}
