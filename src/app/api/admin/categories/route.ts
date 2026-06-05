import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addCategory, readCategoryFile } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import { sanitizeCategoryName } from "@/lib/paths";

export async function GET() {
  const records = await readCategoryFile();
  const posts = await getAllPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }
  const result = records.map((r) => ({
    name: r.name,
    createdAt: r.createdAt,
    count: counts.get(r.name) ?? 0,
  }));
  for (const [name, count] of counts.entries()) {
    if (!result.some((r) => r.name === name)) {
      result.push({ name, createdAt: "", count });
    }
  }
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  let name: string;
  try {
    name = sanitizeCategoryName(String(body.name ?? ""));
  } catch {
    return NextResponse.json({ error: "invalid category name" }, { status: 400 });
  }
  try {
    const record = await addCategory(name);
    revalidatePath("/");
    revalidatePath("/admin/categories");
    revalidatePath("/admin/posts/upload");
    revalidatePath("/admin");
    return NextResponse.json(record, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "CONFLICT") {
      return NextResponse.json({ error: "分类已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
