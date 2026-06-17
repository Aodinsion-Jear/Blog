import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createPostFromPayload, PostEditorError } from "@/lib/postEditor";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const result = await createPostFromPayload(body);

    revalidatePath("/");
    revalidatePath(`/categories/${encodeURIComponent(result.category)}`);
    revalidatePath(`/posts/${result.slug}`);
    revalidatePath("/admin");
    revalidatePath("/admin/posts");
    revalidatePath("/admin/posts/new");

    console.log(`[admin] created post slug=${result.slug} category=${result.category}`);

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof PostEditorError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[admin] create post failed", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
