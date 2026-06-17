"use client";

import dynamic from "next/dynamic";

const MarkdownEditorClient = dynamic(() => import("./RichMarkdownEditorClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[620px] rounded-card border border-warm-border bg-warm-surface p-5 text-sm text-warm-muted">
      编辑器加载中...
    </div>
  ),
});

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function RichMarkdownEditor(props: Props) {
  return <MarkdownEditorClient {...props} />;
}
