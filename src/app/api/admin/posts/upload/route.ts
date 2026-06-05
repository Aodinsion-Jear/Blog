import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import matter from "gray-matter";
import { readCategoryFile } from "@/lib/categories";
import { sanitizeSlug, slugifyTitle, sanitizeCategoryName } from "@/lib/paths";
import {
  nextOrderInCategory,
  postFileExists,
  writePostFile,
} from "@/lib/postWriter";
import { getAllPosts } from "@/lib/posts";

const MAX_SIZE = 1024 * 1024;
const MAX_TITLE_LENGTH = 120;
const MAX_SUMMARY_LENGTH = 300;
const MAX_TAG_LENGTH = 30;

function readTextField(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
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

function parseTags(value: string) {
  const tags = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return Array.from(new Set(tags));
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  const title = readTextField(form, "title");
  const summary = readTextField(form, "summary");
  const date = readTextField(form, "date");
  const tags = parseTags(readTextField(form, "tags"));
  const rawCategory = readTextField(form, "category");
  const customSlugInput = readTextField(form, "slug") || null;
  const overwrite = form.get("overwrite") === "1";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty file" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "文件过大（>1MB）" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".md")) {
    return NextResponse.json({ error: "仅支持 .md 文件" }, { status: 400 });
  }

  if (!title) {
    return NextResponse.json({ error: "请填写标题" }, { status: 400 });
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `标题不能超过 ${MAX_TITLE_LENGTH} 个字符` }, { status: 400 });
  }
  if (!summary) {
    return NextResponse.json({ error: "请填写摘要" }, { status: 400 });
  }
  if (summary.length > MAX_SUMMARY_LENGTH) {
    return NextResponse.json({ error: `摘要不能超过 ${MAX_SUMMARY_LENGTH} 个字符` }, { status: 400 });
  }
  if (!isValidDate(date)) {
    return NextResponse.json({ error: "日期格式无效，请使用 YYYY-MM-DD" }, { status: 400 });
  }
  if (tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
    return NextResponse.json({ error: `单个标签不能超过 ${MAX_TAG_LENGTH} 个字符` }, { status: 400 });
  }

  let category: string;
  try {
    category = sanitizeCategoryName(rawCategory);
  } catch {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const records = await readCategoryFile();
  const posts = await getAllPosts();
  const knownCategories = new Set<string>([
    ...records.map((r) => r.name),
    ...posts.map((p) => p.category),
  ]);
  if (!knownCategories.has(category)) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }

  const text = await file.text();
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(text);
  } catch {
    return NextResponse.json({ error: "frontmatter 解析失败" }, { status: 400 });
  }
  const data = parsed.data as Record<string, unknown>;

  const slugFromFile = file.name.replace(/\.md$/i, "");
  const candidates: string[] = [];
  if (customSlugInput) candidates.push(customSlugInput);
  if (typeof data.slug === "string" && data.slug.trim()) candidates.push(data.slug.trim());
  if (slugFromFile) candidates.push(slugFromFile);
  const fromTitle = slugifyTitle(title);
  if (fromTitle) candidates.push(fromTitle);

  let slug: string | null = null;
  for (const candidate of candidates) {
    try {
      slug = sanitizeSlug(candidate);
      break;
    } catch {
      // try next candidate
    }
  }

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "无法生成有效 slug（slug 仅允许小写字母、数字、连字符、下划线）。请在表单的「自定义 slug」里填一个英文标识，例如 my-new-post。",
      },
      { status: 400 },
    );
  }

  const exists = await postFileExists(slug);
  if (exists && !overwrite) {
    return NextResponse.json({ error: "同名 slug 已存在", slug }, { status: 409 });
  }

  const order = await nextOrderInCategory(category);
  const newFrontmatter: Record<string, unknown> = {
    ...data,
    title,
    summary,
    date,
    category,
    tags,
    order,
  };
  delete newFrontmatter.slug;

  await writePostFile(slug, newFrontmatter, parsed.content);

  revalidatePath("/");
  revalidatePath(`/categories/${encodeURIComponent(category)}`);
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/admin/posts");
  revalidatePath("/admin");

  console.log(`[admin] uploaded post slug=${slug} category=${category} order=${order}`);

  return NextResponse.json({ slug }, { status: 201 });
}
