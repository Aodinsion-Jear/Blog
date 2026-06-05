"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = { categories: string[] };

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function UploadForm({ categories }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [slug, setSlug] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const selectedCategory = category && categories.includes(category) ? category : (categories[0] ?? "");

  const submit = () => {
    setMessage(null);
    if (!file) {
      setMessage({ kind: "err", text: "请选择 .md 文件" });
      return;
    }
    if (!title.trim()) {
      setMessage({ kind: "err", text: "请填写标题" });
      return;
    }
    if (!summary.trim()) {
      setMessage({ kind: "err", text: "请填写摘要" });
      return;
    }
    if (!isValidDate(date)) {
      setMessage({ kind: "err", text: "请选择有效日期" });
      return;
    }
    const parsedTags = parseTags(tags);
    if (!selectedCategory) {
      setMessage({ kind: "err", text: "请选择分类" });
      return;
    }
    const form = new FormData();
    form.set("file", file);
    form.set("title", title.trim());
    form.set("summary", summary.trim());
    form.set("date", date);
    form.set("tags", parsedTags.join(","));
    form.set("category", selectedCategory);
    if (slug.trim()) form.set("slug", slug.trim());
    if (overwrite) form.set("overwrite", "1");

    start(async () => {
      const res = await fetch("/api/admin/posts/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "err", text: data.error ?? `上传失败 (${res.status})` });
        return;
      }
      setMessage({ kind: "ok", text: `上传成功：${data.slug}` });
      setFile(null);
      setTitle("");
      setSummary("");
      setDate("");
      setTags("");
      setSlug("");
      setOverwrite(false);
      const input = document.getElementById("upload-file") as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    });
  };

  return (
    <section className="grid gap-4 rounded-card border border-warm-border bg-warm-surface p-6">
      <label className="grid gap-2 text-sm">
        <span>Markdown 文件</span>
        <input
          id="upload-file"
          type="file"
          accept=".md,text/markdown"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block text-sm text-warm-foreground file:mr-3 file:rounded-[6px] file:border-0 file:bg-warm-accentSoft/40 file:px-3 file:py-1.5 file:text-warm-accentDark"
        />
        <span className="text-xs text-warm-muted">文件可以只包含正文，frontmatter 会由表单生成。</span>
      </label>

      <label className="grid gap-2 text-sm">
        <span>标题</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题"
          className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span>摘要</span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="这是一段简短摘要，会显示在文章列表和文章详情页顶部。"
          rows={3}
          className="resize-none rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          <span>日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span>分类</span>
          <select
            value={selectedCategory}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
          >
            {categories.length === 0 ? <option value="">（先去创建分类）</option> : null}
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="grid gap-2 text-sm">
        <span>
          标签 <span className="text-xs text-warm-muted">（可选）</span>
        </span>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="例如 Next.js, Markdown"
          className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
        />
        <span className="text-xs text-warm-muted">多个标签用英文逗号分隔；不填则不添加标签。</span>
      </label>

      <label className="grid gap-2 text-sm">
        <span>
          自定义 slug <span className="text-xs text-warm-muted">（可选，留空则用文件名）</span>
        </span>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="例如 my-new-post"
          className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
        />
        <span className="text-xs text-warm-muted">仅允许小写字母、数字、连字符与下划线。</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={overwrite}
          onChange={(e) => setOverwrite(e.target.checked)}
        />
        <span>同名 slug 时覆盖现有文章</span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
        >
          {pending ? "上传中…" : "上传"}
        </button>
        {message ? (
          <p
            className={
              message.kind === "ok"
                ? "text-sm text-warm-accentDark"
                : "text-sm text-warm-accentDark"
            }
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </section>
  );
}
