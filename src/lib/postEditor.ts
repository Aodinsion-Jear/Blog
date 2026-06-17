import { readCategoryFile } from "./categories";
import { getAllPosts, getPostBySlug } from "./posts";
import { sanitizeCategoryName, sanitizeSlug } from "./paths";
import { nextOrderInCategory, postFileExists, writePostFile } from "./postWriter";

const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 300;
const MAX_TAG_LENGTH = 30;
const MAX_CONTENT_LENGTH = 1024 * 1024;

export class PostEditorError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PostEditorError";
    this.status = status;
  }
}

type PostPayload = {
  slug?: unknown;
  title?: unknown;
  summary?: unknown;
  date?: unknown;
  category?: unknown;
  tags?: unknown;
  content?: unknown;
};

type NormalizedPostPayload = {
  slug?: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  tags: string[];
  content: string;
};

function isRecord(value: unknown): value is PostPayload {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readRequiredString(value: unknown, field: string) {
  if (typeof value !== "string") {
    throw new PostEditorError(`${field} 格式无效`);
  }
  return value.trim();
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    throw new PostEditorError("标签格式无效");
  }

  const tags = value.map((item) => {
    if (typeof item !== "string") {
      throw new PostEditorError("标签格式无效");
    }
    return item.trim();
  });

  const normalized = Array.from(new Set(tags.filter(Boolean)));
  if (normalized.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    throw new PostEditorError(`单个标签不能超过 ${MAX_TAG_LENGTH} 个字符`);
  }

  return normalized;
}

async function assertKnownCategory(category: string) {
  const records = await readCategoryFile();
  const posts = await getAllPosts();
  const knownCategories = new Set<string>([
    ...records.map((record) => record.name),
    ...posts.map((post) => post.category),
  ]);

  if (!knownCategories.has(category)) {
    throw new PostEditorError("分类不存在");
  }
}

async function normalizePostPayload(
  body: unknown,
  options: { requireSlug: boolean },
): Promise<NormalizedPostPayload> {
  if (!isRecord(body)) {
    throw new PostEditorError("invalid json");
  }

  const title = readRequiredString(body.title, "标题");
  const summary = readRequiredString(body.summary, "摘要");
  const date = readRequiredString(body.date, "日期");
  const content = typeof body.content === "string" ? body.content : null;

  if (!title) {
    throw new PostEditorError("请填写标题");
  }
  if (title.length > MAX_TITLE_LENGTH) {
    throw new PostEditorError(`标题不能超过 ${MAX_TITLE_LENGTH} 个字符`);
  }
  if (!summary) {
    throw new PostEditorError("请填写摘要");
  }
  if (summary.length > MAX_SUMMARY_LENGTH) {
    throw new PostEditorError(`摘要不能超过 ${MAX_SUMMARY_LENGTH} 个字符`);
  }
  if (!isValidDate(date)) {
    throw new PostEditorError("日期格式无效，请使用 YYYY-MM-DD");
  }
  if (content === null) {
    throw new PostEditorError("正文格式无效");
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    throw new PostEditorError("正文不能超过 1MB");
  }

  let category: string;
  try {
    category = sanitizeCategoryName(readRequiredString(body.category, "分类"));
  } catch {
    throw new PostEditorError("分类格式无效");
  }
  await assertKnownCategory(category);

  const normalized: NormalizedPostPayload = {
    title,
    summary,
    date,
    category,
    tags: normalizeTags(body.tags),
    content,
  };

  if (options.requireSlug) {
    try {
      normalized.slug = sanitizeSlug(readRequiredString(body.slug, "slug"));
    } catch {
      throw new PostEditorError(
        "slug 仅允许小写字母、数字、连字符和下划线，且不能超过 80 个字符",
      );
    }
  }

  return normalized;
}

export async function createPostFromPayload(body: unknown) {
  const payload = await normalizePostPayload(body, { requireSlug: true });
  const slug = payload.slug!;

  if (await postFileExists(slug)) {
    throw new PostEditorError("同名 slug 已存在", 409);
  }

  const order = await nextOrderInCategory(payload.category);
  await writePostFile(
    slug,
    {
      title: payload.title,
      summary: payload.summary,
      date: payload.date,
      category: payload.category,
      tags: payload.tags,
      order,
    },
    payload.content,
  );

  return { slug, category: payload.category };
}

export async function updatePostFromPayload(rawSlug: string, body: unknown) {
  let slug: string;
  try {
    slug = sanitizeSlug(rawSlug);
  } catch {
    throw new PostEditorError("invalid slug");
  }

  const post = await getPostBySlug(slug);
  if (!post) {
    throw new PostEditorError("文章不存在", 404);
  }

  const payload = await normalizePostPayload(body, { requireSlug: false });
  const frontmatter: Record<string, unknown> = {
    ...post.rawFrontmatter,
    title: payload.title,
    summary: payload.summary,
    date: payload.date,
    category: payload.category,
    tags: payload.tags,
  };

  delete frontmatter.slug;

  await writePostFile(slug, frontmatter, payload.content);

  return {
    slug,
    previousCategory: post.category,
    category: payload.category,
  };
}
