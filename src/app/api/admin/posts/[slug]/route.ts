import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { sanitizeSlug } from "@/lib/paths";
import { getPostBySlug } from "@/lib/posts";
import { deletePostFile, reflowOrderForCategory } from "@/lib/postWriter";
import { verifyAdmin } from "@/lib/adminStore";

type Ctx = { params: Promise<{ slug: string }> };

export async function DELETE(req: Request, { params }: Ctx) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  if (!body.password || !(await verifyAdmin("gzlyyds", body.password))) {
    return NextResponse.json({ error: "密码错误" }, { status: 403 });
  }

  const { slug: rawSlug } = await params;
  let slug: string;
  try {
    slug = sanitizeSlug(decodeURIComponent(rawSlug));
  } catch {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }

  const post = await getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }
  const category = post.category;

  try {
    await deletePostFile(slug);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "文章不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  try {
    await reflowOrderForCategory(category);
  } catch (err) {
    console.error(`[admin] reflow order failed for category=${category}`, err);
  }

  revalidatePath("/");
  revalidatePath(`/categories/${encodeURIComponent(category)}`);
  revalidatePath(`/posts/${slug}`);
  revalidatePath("/admin/posts");
  revalidatePath("/admin");

  console.log(`[admin] deleted post slug=${slug} category=${category}`);

  return new NextResponse(null, { status: 204 });
}
