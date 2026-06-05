import Link from "next/link";
import type { Category } from "@/lib/posts";

type CategoryNavProps = {
  categories: Category[];
  currentCategory?: string;
};

const baseClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200";
const activeClass =
  "border border-warm-accent bg-warm-accent text-warm-surface shadow-[0_1px_2px_rgba(168,95,69,0.25)] hover:bg-warm-accentDark";
const inactiveClass =
  "border border-warm-border bg-warm-surface text-warm-foreground hover:border-warm-accent/50 hover:bg-warm-accentSoft/30 hover:text-warm-accentDark";

export function CategoryNav({ categories, currentCategory }: CategoryNavProps) {
  const isAllActive = !currentCategory;

  return (
    <div id="categories" className="flex flex-wrap gap-2">
      <Link href="/" className={`${baseClass} ${isAllActive ? activeClass : inactiveClass}`}>
        全部
      </Link>
      {categories.map((category) => {
        const isActive = category.name === currentCategory;

        return (
          <Link
            href={`/categories/${encodeURIComponent(category.name)}`}
            className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
            key={category.name}
          >
            <span>{category.name}</span>
            <span
              className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                isActive
                  ? "bg-warm-surface/25 text-warm-surface"
                  : "bg-warm-accentSoft/40 text-warm-accentDark"
              }`}
            >
              {category.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
