import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setOrderForCategory } from "@/lib/postWriter";
import { sanitizeCategoryName } from "@/lib/paths";

export async function POST(req: Request) {
  let body: { category?: string; slugs?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  let category: string;
  try {
    category = sanitizeCategoryName(String(body.category ?? ""));
  } catch {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (!Array.isArray(body.slugs) || body.slugs.some((s) => typeof s !== "string")) {
    return NextResponse.json({ error: "invalid slugs" }, { status: 400 });
  }

  try {
    await setOrderForCategory(category, body.slugs);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "BAD_REQUEST") {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath(`/categories/${encodeURIComponent(category)}`);
  revalidatePath("/admin/posts");

  console.log(`[admin] reordered category=${category} count=${body.slugs.length}`);

  return new NextResponse(null, { status: 204 });
}
