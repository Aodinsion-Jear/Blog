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

type Item = { name: string; createdAt: string; count: number };

export function CategoryManager({ initial }: { initial: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const create = () => {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    start(async () => {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `请求失败 (${res.status})`);
        return;
      }
      const record = await res.json();
      setItems((prev) => [...prev, { ...record, count: 0 }]);
      setName("");
      router.refresh();
    });
  };

  const remove = (item: Item) => {
    if (item.count > 0) return;
    if (!confirm(`确认删除分类「${item.name}」？`)) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(item.name)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `删除失败 (${res.status})`);
        return;
      }
      setItems((prev) => prev.filter((i) => i.name !== item.name));
      setDirty(false);
      router.refresh();
    });
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.name === active.id);
      const newIndex = prev.findIndex((i) => i.name === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
    setDirty(true);
    setMessage(null);
  };

  const saveOrder = () => {
    setMessage(null);
    start(async () => {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ names: items.map((i) => i.name) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage({ kind: "err", text: data.error ?? `保存失败 (${res.status})` });
        return;
      }
      setMessage({ kind: "ok", text: "顺序已保存" });
      setDirty(false);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-card border border-warm-border bg-warm-surface p-5">
        <h2 className="font-serif text-lg font-semibold">新建分类</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：技术、随笔"
            maxLength={30}
            onKeyDown={(e) => {
              if (e.key === "Enter") create();
            }}
            className="flex-1 rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
          />
          <button
            type="button"
            onClick={create}
            disabled={pending || !name.trim()}
            className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
          >
            创建
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-warm-accentDark">{error}</p> : null}
      </section>

      <section className="rounded-card border border-warm-border bg-warm-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold">分类列表</h2>
          {dirty && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={saveOrder}
                disabled={pending}
                className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
              >
                {pending ? "保存中…" : "保存顺序"}
              </button>
            </div>
          )}
          {message && (
            <p className={`text-sm ${message.kind === "ok" ? "text-green-600" : "text-warm-accentDark"}`}>
              {message.text}
            </p>
          )}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.name)} strategy={verticalListSortingStrategy}>
            <ul className="grid gap-2">
              {items.map((item, idx) => (
                <SortableRow
                  key={item.name}
                  item={item}
                  index={idx}
                  onRemove={() => remove(item)}
                  pending={pending}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-warm-muted">还没有分类</p>
        )}
      </section>
    </div>
  );
}

function SortableRow({
  item,
  index,
  onRemove,
  pending,
}: {
  item: Item;
  index: number;
  onRemove: () => void;
  pending: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.name,
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
      <span className="w-6 shrink-0 text-xs text-warm-muted">#{index + 1}</span>
      <span className="flex-1 font-medium">{item.name}</span>
      <span className="hidden text-xs text-warm-muted sm:inline">
        {item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : "—"}
      </span>
      <span className="text-xs text-warm-muted">{item.count} 篇</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        disabled={item.count > 0 || pending}
        title={item.count > 0 ? "分类下还有文章，无法删除" : ""}
        className="text-xs text-warm-accentDark transition hover:underline disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:no-underline"
      >
        删除
      </button>
    </li>
  );
}
