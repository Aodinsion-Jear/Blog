import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteCategory } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";
import { sanitizeCategoryName } from "@/lib/paths";

type Ctx = { params: Promise<{ name: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { name: rawName } = await params;
  let name: string;
  try {
    name = sanitizeCategoryName(decodeURIComponent(rawName));
  } catch {
    return NextResponse.json({ error: "invalid category name" }, { status: 400 });
  }
  const posts = await getAllPosts();
  const count = posts.filter((p) => p.category === name).length;
  if (count > 0) {
    return NextResponse.json(
      { error: `分类下还有 ${count} 篇文章，不能删除`, count },
      { status: 409 },
    );
  }
  try {
    await deleteCategory(name);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "NOT_FOUND") {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
  revalidatePath("/");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/posts/upload");
  revalidatePath("/admin");
  return new NextResponse(null, { status: 204 });
}
