import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setOrderAcrossCategories, setOrderForCategory } from "@/lib/postWriter";
import { sanitizeCategoryName } from "@/lib/paths";

type LegacyReorderBody = {
  category?: string;
  slugs?: unknown;
};

type CrossCategoryReorderBody = {
  categories?: unknown;
};

type ReorderBody = LegacyReorderBody & CrossCategoryReorderBody;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function revalidateAdminPostViews(categories: string[], movedSlugs: string[] = []) {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/posts");
  revalidatePath("/admin/categories");

  for (const category of categories) {
    const encodedCategory = encodeURIComponent(category);
    revalidatePath(`/categories/${encodedCategory}`);
    revalidatePath(`/admin/posts/reorder/${encodedCategory}`);
  }

  for (const slug of movedSlugs) {
    revalidatePath(`/posts/${slug}`);
  }
}

export async function POST(req: Request) {
  let body: ReorderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (Array.isArray(body.categories)) {
    const categories = [];
    for (const item of body.categories) {
      if (!item || typeof item !== "object") {
        return NextResponse.json({ error: "invalid categories" }, { status: 400 });
      }
      const record = item as { name?: unknown; slugs?: unknown };
      if (typeof record.name !== "string" || !isStringArray(record.slugs)) {
        return NextResponse.json({ error: "invalid categories" }, { status: 400 });
      }
      categories.push({ category: record.name, slugs: record.slugs });
    }

    try {
      const result = await setOrderAcrossCategories(categories);
      revalidateAdminPostViews(result.touchedCategories, result.movedSlugs);
      console.log(
        `[admin] reordered across categories=${categories.length} updated=${result.updatedCount}`,
      );
      return NextResponse.json({ updated: result.updatedCount });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "BAD_REQUEST") {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      }
      return NextResponse.json({ error: "internal error" }, { status: 500 });
    }
  }

  let category: string;
  try {
    category = sanitizeCategoryName(String(body.category ?? ""));
  } catch {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }
  if (!isStringArray(body.slugs)) {
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

  revalidateAdminPostViews([category]);

  console.log(`[admin] reordered category=${category} count=${body.slugs.length}`);

  return new NextResponse(null, { status: 204 });
}
