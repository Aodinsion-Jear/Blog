import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { POSTS_DIR } from "./paths";
import { readCategoryFile, ensureCategoryFile } from "./categories";
export { searchPosts } from "./search";

export type Post = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  tags: string[];
  order?: number;
  content: string;
  searchText: string;
  rawFrontmatter: Record<string, unknown>;
};

export type Category = {
  name: string;
  count: number;
};

type PostMatter = {
  title?: string;
  summary?: string;
  date?: string;
  category?: string;
  tags?: string[];
  order?: number;
};

function buildSearchText(post: Omit<Post, "searchText" | "rawFrontmatter">) {
  return [post.title, post.summary, post.content, post.category, ...post.tags]
    .join(" ")
    .toLowerCase();
}

async function readPostFile(fileName: string): Promise<Post> {
  const slug = fileName.replace(/\.md$/, "");
  const fullPath = path.join(POSTS_DIR, fileName);
  const fileContents = await fs.readFile(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontmatter = data as PostMatter;
  const rawFrontmatter = { ...(data as Record<string, unknown>) };
  const order =
    typeof frontmatter.order === "number" && Number.isFinite(frontmatter.order)
      ? frontmatter.order
      : undefined;

  const post = {
    slug,
    title: frontmatter.title ?? slug,
    summary: frontmatter.summary ?? "",
    date: frontmatter.date ?? "",
    category: frontmatter.category ?? "未分类",
    tags: frontmatter.tags ?? [],
    order,
    content,
  };

  return {
    ...post,
    rawFrontmatter,
    searchText: buildSearchText(post),
  };
}

const ORDER_INF = Number.POSITIVE_INFINITY;

export async function getAllPosts(): Promise<Post[]> {
  const fileNames = await fs.readdir(POSTS_DIR);
  const posts = await Promise.all(
    fileNames.filter((fileName) => fileName.endsWith(".md")).map(readPostFile),
  );

  return posts.sort((a, b) => {
    const oa = typeof a.order === "number" ? a.order : ORDER_INF;
    const ob = typeof b.order === "number" ? b.order : ORDER_INF;
    if (oa !== ob) return oa - ob;
    return b.date.localeCompare(a.date);
  });
}

export async function getPostBySlug(slug: string) {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getAllCategories(posts: Post[]): Promise<Category[]> {
  await ensureCategoryFile(async () => posts.map((p) => p.category || "未分类"));
  const records = await readCategoryFile();

  const counts = posts.reduce<Map<string, number>>((map, post) => {
    map.set(post.category, (map.get(post.category) ?? 0) + 1);
    return map;
  }, new Map());

  const result: Category[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    result.push({ name: record.name, count: counts.get(record.name) ?? 0 });
    seen.add(record.name);
  }
  for (const [name, count] of counts.entries()) {
    if (!seen.has(name)) {
      result.push({ name, count });
    }
  }
  return result;
}

export function getPostsByCategory(posts: Post[], category: string) {
  return posts.filter((post) => post.category === decodeURIComponent(category));
}

export function formatDate(date: string) {
  if (!date) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}
