import Link from "next/link";
import { PostEditorForm } from "../PostEditorForm";
import { getAllCategories, getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">New Post</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">新建文章</h1>
        <p className="mt-3 text-sm text-warm-muted">
          在线编写 Markdown 文章并保存到 content/posts。需要上传现成 .md 文件时，也可以继续使用{" "}
          <Link className="text-warm-accentDark underline-offset-4 hover:underline" href="/admin/posts/upload">
            上传页面
          </Link>
          。
        </p>
      </header>
      <PostEditorForm mode="create" categories={categories.map((category) => category.name)} />
    </div>
  );
}
