import { UploadForm } from "./UploadForm";
import { getAllCategories, getAllPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">Upload</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">上传文章</h1>
        <p className="mt-3 text-sm text-warm-muted">
          选择一个 .md 文件，并在表单里填写标题、摘要、日期、分类和标签。Markdown 可以只写正文；如果文件已有 frontmatter，表单填写的同名字段会优先生效。
        </p>
      </header>
      <UploadForm categories={categories.map((c) => c.name)} />
    </div>
  );
}
