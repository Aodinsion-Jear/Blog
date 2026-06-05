import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readCategoryFile, writeCategoryFile } from "@/lib/categories";

export async function POST(req: Request) {
  let body: { names?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!Array.isArray(body.names) || body.names.some((n) => typeof n !== "string")) {
    return NextResponse.json({ error: "invalid names" }, { status: 400 });
  }

  const records = await readCategoryFile();
  const existing = new Set(records.map((r) => r.name));
  const incoming = new Set(body.names);

  if (incoming.size !== existing.size || body.names.length !== existing.size) {
    return NextResponse.json({ error: "分类列表不匹配" }, { status: 400 });
  }
  for (const name of body.names) {
    if (!existing.has(name)) {
      return NextResponse.json({ error: `未知分类: ${name}` }, { status: 400 });
    }
  }

  const lookup = new Map(records.map((r) => [r.name, r]));
  const reordered = body.names.map((name) => lookup.get(name)!);
  await writeCategoryFile(reordered);

  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts/upload");
  revalidatePath("/admin");

  return new NextResponse(null, { status: 204 });
}
