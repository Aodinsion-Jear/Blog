import type { Post } from "@/lib/posts";
import { PostCard } from "@/components/PostCard";

type PostListProps = {
  posts: Post[];
  emptyMessage?: string;
};

export function PostList({ posts, emptyMessage = "没有找到相关文章。" }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-warm-border px-5 py-10 text-center text-sm text-warm-muted">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </div>
  );
}
