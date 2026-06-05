import path from "node:path";

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");
export const CATEGORIES_FILE = path.join(process.cwd(), "content", "categories.json");
export const DATA_DIR = path.join(process.cwd(), "data");
export const ADMIN_FILE = path.join(DATA_DIR, "admin.json");
export const BANNED_IPS_FILE = path.join(DATA_DIR, "banned-ips.json");

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]*$/;
const FORBIDDEN_CATEGORY_CHARS = /[\\/\0]|\.\./;

export function sanitizeSlug(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.length > 80 || !SLUG_PATTERN.test(trimmed)) {
    throw new Error("invalid slug");
  }
  return trimmed;
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function sanitizeCategoryName(input: string): string {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 30 || FORBIDDEN_CATEGORY_CHARS.test(trimmed)) {
    throw new Error("invalid category name");
  }
  return trimmed;
}

export function safeJoinPost(slug: string): string {
  const sanitized = sanitizeSlug(slug);
  const baseDir = path.resolve(POSTS_DIR);
  const target = path.resolve(baseDir, `${sanitized}.md`);
  if (!target.startsWith(baseDir + path.sep)) {
    throw new Error("path traversal detected");
  }
  return target;
}
