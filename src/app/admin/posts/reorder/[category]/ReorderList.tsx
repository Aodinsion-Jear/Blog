"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type ReorderItem = {
  slug: string;
  title: string;
  date: string;
  order: number | null;
};

type Props = { category: string; initial: ReorderItem[] };

export function ReorderList({ category, initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.slug === active.id);
      const newIndex = prev.findIndex((i) => i.slug === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const save = () => {
    setMessage(null);
    start(async () => {
      const res = await fetch("/api/admin/posts/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, slugs: items.map((i) => i.slug) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ kind: "err", text: data.error ?? `保存失败 (${res.status})` });
        return;
      }
      setMessage({ kind: "ok", text: "顺序已保存" });
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((i) => i.slug)} strategy={verticalListSortingStrategy}>
          <ul className="grid gap-2">
            {items.map((item, idx) => (
              <SortableRow key={item.slug} item={item} index={idx} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存顺序"}
        </button>
        {message ? <p className="text-sm text-warm-accentDark">{message.text}</p> : null}
      </div>
    </div>
  );
}

function SortableRow({ item, index }: { item: ReorderItem; index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.slug,
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
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center gap-4 rounded-card border border-warm-border bg-warm-surface px-4 py-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <span className="w-8 shrink-0 text-xs text-warm-muted">#{index + 1}</span>
      <span className="flex-1 truncate font-medium">{item.title}</span>
      <span className="hidden text-xs text-warm-muted sm:inline">{item.date}</span>
      <code className="hidden text-xs text-warm-muted md:inline">{item.slug}</code>
    </li>
  );
}
