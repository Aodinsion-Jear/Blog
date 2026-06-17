import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditorForm } from "../../PostEditorForm";
import { getAllCategories, getAllPosts, getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

type EditPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeURIComponent(slug));

  if (!post) {
    notFound();
  }

  const posts = await getAllPosts();
  const categories = await getAllCategories(posts);

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">Edit Post</p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">编辑文章</h1>
            <p className="mt-3 text-sm text-warm-muted">
              修改标题、摘要、分类、标签和 Markdown 正文。slug 为固定访问路径，编辑时不修改。
            </p>
          </div>
          <Link
            href={`/posts/${post.slug}`}
            target="_blank"
            className="rounded-[6px] border border-warm-border px-4 py-2 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
          >
            查看文章
          </Link>
        </div>
      </header>
      <PostEditorForm
        mode="edit"
        categories={categories.map((category) => category.name)}
        initialValue={{
          slug: post.slug,
          title: post.title,
          summary: post.summary,
          date: post.date,
          category: post.category,
          tags: post.tags,
          content: post.content,
        }}
      />
    </div>
  );
}
