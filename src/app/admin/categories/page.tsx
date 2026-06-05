import { CategoryManager } from "./CategoryManager";
import { readCategoryFile } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";

export default async function AdminCategoriesPage() {
  const records = await readCategoryFile();
  const posts = await getAllPosts();
  const counts = new Map<string, number>();
  for (const p of posts) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  const list = records.map((r) => ({
    name: r.name,
    createdAt: r.createdAt,
    count: counts.get(r.name) ?? 0,
  }));
  for (const [name, count] of counts.entries()) {
    if (!list.some((r) => r.name === name)) {
      list.push({ name, createdAt: "", count });
    }
  }

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">Categories</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">分类管理</h1>
        <p className="mt-3 text-sm text-warm-muted">
          创建空分类供后续上传使用。非空分类不能删除——先把文章移走或重新上传到其他分类。
        </p>
      </header>
      <CategoryManager initial={list} />
    </div>
  );
}
