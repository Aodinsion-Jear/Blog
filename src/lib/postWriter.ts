import fs from "node:fs/promises";
import matter from "gray-matter";
import { readCategoryFile } from "./categories";
import { POSTS_DIR, safeJoinPost, sanitizeCategoryName, sanitizeSlug } from "./paths";
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

export type CategoryPostOrder = {
  category: string;
  slugs: string[];
};

export type SetOrderAcrossCategoriesResult = {
  touchedCategories: string[];
  movedSlugs: string[];
  updatedCount: number;
};

export async function setOrderAcrossCategories(
  categories: CategoryPostOrder[],
): Promise<SetOrderAcrossCategoriesResult> {
  const posts = await getAllPosts();
  const bySlug = new Map(posts.map((post) => [post.slug, post]));
  const categoryRecords = await readCategoryFile();
  const knownCategories = new Set([
    ...categoryRecords.map((record) => record.name),
    ...posts.map((post) => post.category),
  ]);
  const categoryNames = new Set<string>();
  const payloadSlugs = new Set<string>();

  for (const item of categories) {
    let category: string;
    try {
      category = sanitizeCategoryName(item.category);
    } catch {
      throw Object.assign(new Error("invalid category"), { code: "BAD_REQUEST" });
    }

    if (category !== item.category || categoryNames.has(category)) {
      throw Object.assign(new Error("invalid categories"), { code: "BAD_REQUEST" });
    }
    if (!knownCategories.has(category)) {
      throw Object.assign(new Error(`unknown category ${category}`), { code: "BAD_REQUEST" });
    }
    categoryNames.add(category);

    for (const rawSlug of item.slugs) {
      let slug: string;
      try {
        slug = sanitizeSlug(rawSlug);
      } catch {
        throw Object.assign(new Error("invalid slug"), { code: "BAD_REQUEST" });
      }
      if (slug !== rawSlug || payloadSlugs.has(slug)) {
        throw Object.assign(new Error("duplicate or invalid slug"), { code: "BAD_REQUEST" });
      }
      if (!bySlug.has(slug)) {
        throw Object.assign(new Error("分类或文章列表已变化，请刷新后重试"), {
          code: "BAD_REQUEST",
        });
      }
      payloadSlugs.add(slug);
    }
  }

  if (payloadSlugs.size !== posts.length) {
    throw Object.assign(new Error("分类或文章列表已变化，请刷新后重试"), {
      code: "BAD_REQUEST",
    });
  }

  const touchedCategories = new Set<string>();
  const movedSlugs = new Set<string>();
  let updatedCount = 0;

  for (const item of categories) {
    const category = sanitizeCategoryName(item.category);
    item.slugs.forEach((slug, index) => {
      const post = bySlug.get(slug)!;
      const nextOrder = index + 1;
      if (post.category !== category) {
        touchedCategories.add(post.category);
        touchedCategories.add(category);
        movedSlugs.add(slug);
      } else if (post.order !== nextOrder) {
        touchedCategories.add(category);
      }
    });
  }

  for (const item of categories) {
    const category = sanitizeCategoryName(item.category);
    for (let index = 0; index < item.slugs.length; index++) {
      const slug = item.slugs[index];
      const post = bySlug.get(slug)!;
      const nextOrder = index + 1;
      if (post.category === category && post.order === nextOrder) continue;

      const newFrontmatter = {
        ...post.rawFrontmatter,
        category,
        order: nextOrder,
      };
      await writePostFile(slug, newFrontmatter, post.content);
      updatedCount++;
    }
  }

  return {
    touchedCategories: Array.from(touchedCategories),
    movedSlugs: Array.from(movedSlugs),
    updatedCount,
  };
}
