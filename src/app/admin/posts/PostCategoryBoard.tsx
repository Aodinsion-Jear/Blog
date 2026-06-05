"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DeletePostButton } from "@/components/admin/DeletePostButton";

type BoardCategory = {
  name: string;
};

type BoardPost = {
  slug: string;
  title: string;
  date: string;
  formattedDate: string;
  category: string;
  order: number | null;
};

type CategoryColumn = {
  name: string;
  posts: BoardPost[];
};

type Location = {
  categoryIndex: number;
  postIndex: number;
};

type Message = {
  kind: "ok" | "err";
  text: string;
};

type Props = {
  categories: BoardCategory[];
  posts: BoardPost[];
};

const POST_PREFIX = "post:";
const CATEGORY_PREFIX = "category:";

function postId(slug: string) {
  return `${POST_PREFIX}${slug}`;
}

function categoryId(name: string) {
  return `${CATEGORY_PREFIX}${name}`;
}

function getPostSlug(id: UniqueIdentifier) {
  const value = String(id);
  return value.startsWith(POST_PREFIX) ? value.slice(POST_PREFIX.length) : null;
}

function getCategoryName(id: UniqueIdentifier) {
  const value = String(id);
  return value.startsWith(CATEGORY_PREFIX) ? value.slice(CATEGORY_PREFIX.length) : null;
}

function buildColumns(categories: BoardCategory[], posts: BoardPost[]): CategoryColumn[] {
  return categories.map((category) => ({
    name: category.name,
    posts: posts
      .filter((post) => post.category === category.name)
      .map((post) => ({ ...post })),
  }));
}

function findPostLocation(columns: CategoryColumn[], slug: string): Location | null {
  for (let categoryIndex = 0; categoryIndex < columns.length; categoryIndex++) {
    const postIndex = columns[categoryIndex].posts.findIndex((post) => post.slug === slug);
    if (postIndex >= 0) return { categoryIndex, postIndex };
  }
  return null;
}

function findOverLocation(columns: CategoryColumn[], id: UniqueIdentifier): Location | null {
  const categoryName = getCategoryName(id);
  if (categoryName) {
    const categoryIndex = columns.findIndex((column) => column.name === categoryName);
    if (categoryIndex < 0) return null;
    return { categoryIndex, postIndex: columns[categoryIndex].posts.length };
  }

  const slug = getPostSlug(id);
  return slug ? findPostLocation(columns, slug) : null;
}

export function PostCategoryBoard({ categories, posts }: Props) {
  const router = useRouter();
  const [columns, setColumns] = useState(() => buildColumns(categories, posts));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [pending, start] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeSlug = getPostSlug(active.id);
    if (!activeSlug) return;

    setColumns((current) => {
      const activeLocation = findPostLocation(current, activeSlug);
      const overLocation = findOverLocation(current, over.id);
      if (!activeLocation || !overLocation) return current;

      if (activeLocation.categoryIndex === overLocation.categoryIndex) {
        const column = current[activeLocation.categoryIndex];
        const nextIndex = Math.min(overLocation.postIndex, column.posts.length - 1);
        if (activeLocation.postIndex === nextIndex) return current;

        const next = [...current];
        next[activeLocation.categoryIndex] = {
          ...column,
          posts: arrayMove(column.posts, activeLocation.postIndex, nextIndex),
        };
        setDirty(true);
        setMessage(null);
        return next;
      }

      const movingPost = current[activeLocation.categoryIndex].posts[activeLocation.postIndex];
      const next = current.map((column) => ({ ...column, posts: [...column.posts] }));
      next[activeLocation.categoryIndex].posts.splice(activeLocation.postIndex, 1);
      const destination = next[overLocation.categoryIndex];
      const insertIndex = Math.min(overLocation.postIndex, destination.posts.length);
      destination.posts.splice(insertIndex, 0, {
        ...movingPost,
        category: destination.name,
      });
      setDirty(true);
      setMessage(null);
      return next;
    });
  };

  const reset = () => {
    setColumns(buildColumns(categories, posts));
    setDirty(false);
    setMessage(null);
  };

  const save = () => {
    setMessage(null);
    start(async () => {
      const res = await fetch("/api/admin/posts/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categories: columns.map((column) => ({
            name: column.name,
            slugs: column.posts.map((post) => post.slug),
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ kind: "err", text: data.error ?? `保存失败 (${res.status})` });
        return;
      }

      setDirty(false);
      setMessage({ kind: "ok", text: "分类和顺序已保存" });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warm-border bg-warm-surface px-5 py-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">拖拽排序</h2>
          <p className="mt-1 text-sm text-warm-muted">
            拖动每篇文章左侧的手柄，可以在同一分类内排序，也可以拖到其他分类。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            disabled={pending || !dirty}
            className="rounded-[6px] border border-warm-border px-4 py-2 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            撤销更改
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "保存中…" : "保存更改"}
          </button>
        </div>
      </div>

      {message ? (
        <p className={`text-sm ${message.kind === "ok" ? "text-green-600" : "text-warm-accentDark"}`}>
          {message.text}
        </p>
      ) : null}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="grid gap-6">
          {columns.map((column) => (
            <CategorySection key={column.name} column={column} pending={pending} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function CategorySection({ column, pending }: { column: CategoryColumn; pending: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: categoryId(column.name) });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-card border bg-warm-surface transition ${
        isOver ? "border-warm-accent/60 shadow-sm" : "border-warm-border"
      }`}
    >
      <div className="flex items-center justify-between border-b border-warm-border px-5 py-3">
        <div>
          <h2 className="font-serif text-lg font-semibold">{column.name}</h2>
          <p className="text-xs text-warm-muted">{column.posts.length} 篇</p>
        </div>
      </div>

      <SortableContext items={column.posts.map((post) => postId(post.slug))} strategy={verticalListSortingStrategy}>
        {column.posts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-warm-muted">这个分类下还没有文章。拖拽文章到这里。</p>
        ) : (
          <ul className="divide-y divide-warm-border">
            {column.posts.map((post, index) => (
              <SortablePostRow key={post.slug} post={post} index={index} pending={pending} />
            ))}
          </ul>
        )}
      </SortableContext>
    </section>
  );
}

function SortablePostRow({
  post,
  index,
  pending,
}: {
  post: BoardPost;
  index: number;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: postId(post.slug),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 bg-warm-surface px-5 py-3 text-sm transition hover:bg-warm-accentSoft/20"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={pending}
        aria-label={`拖拽移动 ${post.title}`}
        className="shrink-0 cursor-grab rounded-[6px] border border-warm-border px-2 py-1 text-xs text-warm-muted transition hover:border-warm-accent/60 hover:text-warm-accent active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        ⋮⋮
      </button>
      <span className="w-10 shrink-0 text-xs text-warm-muted">#{index + 1}</span>
      <Link
        href={`/posts/${post.slug}`}
        target="_blank"
        className="flex-1 truncate font-medium text-warm-foreground transition hover:text-warm-accent"
      >
        {post.title}
      </Link>
      <span className="hidden text-xs text-warm-muted sm:inline">{post.formattedDate}</span>
      <code className="hidden text-xs text-warm-muted md:inline">{post.slug}</code>
      <DeletePostButton slug={post.slug} title={post.title} />
    </li>
  );
}
