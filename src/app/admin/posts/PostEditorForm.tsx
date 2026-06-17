"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RichMarkdownEditor } from "./RichMarkdownEditor";

type PostEditorMode = "create" | "edit";

export type PostEditorInitialValue = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  tags: string[];
  content: string;
};

type Props = {
  mode: PostEditorMode;
  categories: string[];
  initialValue?: PostEditorInitialValue;
};

type Message = {
  kind: "ok" | "err";
  text: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function defaultValue(categories: string[]): PostEditorInitialValue {
  return {
    slug: "",
    title: "",
    summary: "",
    date: today(),
    category: categories[0] ?? "",
    tags: [],
    content: "",
  };
}

export function PostEditorForm({ mode, categories, initialValue }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const value = initialValue ?? defaultValue(categories);
  const [slug, setSlug] = useState(value.slug);
  const [title, setTitle] = useState(value.title);
  const [summary, setSummary] = useState(value.summary);
  const [date, setDate] = useState(value.date);
  const [category, setCategory] = useState(value.category);
  const [tags, setTags] = useState(value.tags.join(", "));
  const [content, setContent] = useState(value.content);
  const [message, setMessage] = useState<Message | null>(null);
  const selectedCategory =
    category && categories.includes(category) ? category : (categories[0] ?? "");

  const validate = () => {
    if (mode === "create" && !slug.trim()) return "请填写 slug";
    if (!title.trim()) return "请填写标题";
    if (!summary.trim()) return "请填写摘要";
    if (!date) return "请选择日期";
    if (!selectedCategory) return "请选择分类";
    return null;
  };

  const buildPayload = () => ({
    ...(mode === "create" ? { slug: slug.trim() } : {}),
    title: title.trim(),
    summary: summary.trim(),
    date,
    category: selectedCategory,
    tags: normalizeTags(tags),
    content,
  });

  const save = () => {
    const error = validate();
    if (error) {
      setMessage({ kind: "err", text: error });
      return;
    }

    setMessage(null);
    start(async () => {
      const url =
        mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${encodeURIComponent(slug)}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? `保存失败 (${res.status})` });
        return;
      }

      const savedSlug = typeof data.slug === "string" ? data.slug : slug;
      setMessage({ kind: "ok", text: "保存成功" });
      router.refresh();
      if (mode === "create") {
        router.push(`/admin/posts/${encodeURIComponent(savedSlug)}/edit`);
      }
    });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-card border border-warm-border bg-warm-surface p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <label className="grid gap-2 text-sm">
            <span>slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              readOnly={mode === "edit"}
              placeholder="my-new-post"
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent read-only:text-warm-muted"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span>日期</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent"
            />
          </label>
        </div>

        <label className="grid gap-2 text-sm">
          <span>标题</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="文章标题"
            className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span>摘要</span>
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="显示在文章列表和详情页顶部的简短摘要"
            rows={3}
            className="resize-none rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>分类</span>
            <select
              value={selectedCategory}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent"
            >
              {categories.length === 0 ? <option value="">（先去创建分类）</option> : null}
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm">
            <span>标签</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Next.js, Markdown"
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none transition focus:border-warm-accent"
            />
          </label>
        </div>
      </section>

      <section className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">正文</h2>
          <p className="text-xs text-warm-muted">支持直接输入 Markdown 快捷语法，也可以用工具栏切换源码。</p>
        </div>
        <RichMarkdownEditor value={content} onChange={setContent} />
      </section>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-warm-border bg-warm-background/95 py-4 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={pending || categories.length === 0}
          className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "保存中…" : "保存文章"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/posts")}
          className="rounded-[6px] border border-warm-border px-4 py-2 text-sm text-warm-muted transition hover:border-warm-accent/50 hover:text-warm-accent"
        >
          返回列表
        </button>
        {message ? (
          <p className={`text-sm ${message.kind === "ok" ? "text-green-600" : "text-warm-accentDark"}`}>
            {message.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
