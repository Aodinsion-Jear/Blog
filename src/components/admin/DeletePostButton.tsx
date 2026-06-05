"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  title: string;
};

export function DeletePostButton({ slug, title }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [showModal]);

  const openModal = () => {
    setError(null);
    setPassword("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setPassword("");
    setError(null);
  };

  const confirmDelete = () => {
    if (pending || !password) return;
    setError(null);
    start(async () => {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `删除失败 (${res.status})`);
        return;
      }
      closeModal();
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        disabled={pending}
        className="rounded-[6px] border border-warm-border px-2.5 py-1 text-xs text-warm-muted transition hover:border-warm-accent/60 hover:text-warm-accent disabled:opacity-50"
      >
        {pending ? "删除中…" : "删除"}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "Escape") closeModal();
          }}
        >
          <div className="w-full max-w-sm rounded-card border border-warm-border bg-warm-surface p-6 shadow-lg">
            <h3 className="font-serif text-lg font-semibold">
              确认删除「{title}」
            </h3>
            <p className="mt-2 text-sm text-warm-muted">
              此操作不可撤销。请输入管理员密码确认。
            </p>
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmDelete();
              }}
              placeholder="管理员密码"
              className="mt-4 w-full rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
            />
            {error && (
              <p className="mt-2 text-sm text-warm-accentDark">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="rounded-[6px] border border-warm-border px-4 py-2 text-sm transition hover:bg-warm-background disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={pending || !password}
                className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
              >
                {pending ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
