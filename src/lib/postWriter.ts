import fs from "node:fs/promises";
import matter from "gray-matter";
import { POSTS_DIR, safeJoinPost } from "./paths";
import { getAllPosts } from "./posts";

export async function listPostFiles(): Promise<string[]> {
  const names = await fs.readdir(POSTS_DIR);
  return names.filter((n) => n.endsWith(".md"));
}

export async function postFileExists(slug: string): Promise<boolean> {
  try {
    await fs.access(safeJoinPost(slug));
    return true;
  } catch {
    return false;
  }
}

export async function writePostFile(
  slug: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<void> {
  const target = safeJoinPost(slug);
  const text = matter.stringify(body, frontmatter);
  await fs.writeFile(target, text, "utf8");
}

export async function deletePostFile(slug: string): Promise<void> {
  const target = safeJoinPost(slug);
  try {
    await fs.unlink(target);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw Object.assign(new Error("post not found"), { code: "NOT_FOUND" });
    }
    throw err;
  }
}

export async function reflowOrderForCategory(category: string): Promise<void> {
  const posts = await getAllPosts();
  const inCategory = posts
    .filter((p) => p.category === category)
    .sort((a, b) => {
      const oa = typeof a.order === "number" ? a.order : Number.POSITIVE_INFINITY;
      const ob = typeof b.order === "number" ? b.order : Number.POSITIVE_INFINITY;
      if (oa !== ob) return oa - ob;
      return b.date.localeCompare(a.date);
    });
  for (let i = 0; i < inCategory.length; i++) {
    const post = inCategory[i];
    const nextOrder = i + 1;
    if (post.order === nextOrder) continue;
    const newFrontmatter = { ...post.rawFrontmatter, order: nextOrder };
    await writePostFile(post.slug, newFrontmatter, post.content);
  }
}

export async function nextOrderInCategory(category: string): Promise<number> {
  const posts = await getAllPosts();
  const inCategory = posts.filter((p) => p.category === category);
  if (inCategory.length === 0) return 1;
  let max = 0;
  let hasOrder = false;
  for (const post of inCategory) {
    if (typeof post.order === "number" && Number.isFinite(post.order)) {
      hasOrder = true;
      if (post.order > max) max = post.order;
    }
  }
  return hasOrder ? max + 1 : inCategory.length + 1;
}

export async function setOrderForCategory(category: string, slugs: string[]): Promise<void> {
  const posts = await getAllPosts();
  const byCategory = posts.filter((p) => p.category === category);
  const known = new Set(byCategory.map((p) => p.slug));
  for (const slug of slugs) {
    if (!known.has(slug)) {
      throw Object.assign(new Error(`slug ${slug} not in category ${category}`), {
        code: "BAD_REQUEST",
      });
    }
  }
  if (slugs.length !== byCategory.length) {
    throw Object.assign(new Error("slugs list does not cover all posts in category"), {
      code: "BAD_REQUEST",
    });
  }

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const post = byCategory.find((p) => p.slug === slug)!;
    const newFrontmatter = { ...post.rawFrontmatter, order: i + 1 };
    await writePostFile(slug, newFrontmatter, post.content);
  }
}
