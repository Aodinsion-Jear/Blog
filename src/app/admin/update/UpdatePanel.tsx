"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommitLogEntry, UpdateStatus, UpdateState } from "@/lib/updater";

type Props = {
  current: string | null;
  latest: string | null;
  hasUpdate: boolean;
  available: boolean;
  initialLog: CommitLogEntry[];
  initialStatus: UpdateStatus;
};

const RUNNING: UpdateState[] = ["pending", "pulling", "building", "restarting"];

const STATE_LABEL: Record<UpdateState, string> = {
  idle: "空闲",
  pending: "已排队",
  pulling: "拉取代码中",
  building: "重新构建中",
  restarting: "重启服务中",
  done: "更新完成",
  error: "更新失败",
};

function short(sha: string | null): string {
  return sha ? sha.slice(0, 7) : "未知";
}

export function UpdatePanel({
  current,
  latest,
  hasUpdate,
  available,
  initialLog,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<UpdateStatus>(initialStatus);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // 容器重启期间轮询会短暂失败，记录一下以便给出「等待服务恢复」的提示而非直接判失败。
  const [waiting, setWaiting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = RUNNING.includes(status.state);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/update/status", { cache: "no-store" });
      if (!res.ok) {
        setWaiting(true);
        return;
      }
      const data = (await res.json()) as UpdateStatus;
      setWaiting(false);
      setStatus(data);
      if (data.state === "done") {
        // 新版本已经起来了，刷新页面让顶部版本号和红点归位。
        router.refresh();
      }
    } catch {
      // 重启中断开属正常现象，标记等待，下次轮询继续。
      setWaiting(true);
    }
  }, [router]);

  useEffect(() => {
    if (!running) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    // 立刻轮询一次再进入定时轮询；用 setTimeout(0) 而非直接调用，
    // 避免在 effect 体内同步触发 setState。
    const kick = setTimeout(poll, 0);
    pollRef.current = setInterval(poll, 3000);
    return () => {
      clearTimeout(kick);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [running, poll]);

  const apply = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/update/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `请求失败 (${res.status})`);
        setSubmitting(false);
        return;
      }
      setShowConfirm(false);
      setPassword("");
      setStatus({ state: "pending", message: "更新已发起，等待主机执行…" });
    } catch {
      setError("网络错误，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-card border border-warm-border bg-warm-surface p-5">
        <h2 className="font-serif text-lg font-semibold">版本</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[6px] border border-warm-border bg-warm-background px-4 py-3">
            <p className="text-xs text-warm-muted">当前版本</p>
            <p className="mt-1 font-mono text-sm">{short(current)}</p>
          </div>
          <div className="rounded-[6px] border border-warm-border bg-warm-background px-4 py-3">
            <p className="text-xs text-warm-muted">最新版本</p>
            <p className="mt-1 font-mono text-sm">{short(latest)}</p>
          </div>
        </div>

        {!available ? (
          <p className="mt-4 text-sm text-warm-muted">
            暂时无法获取版本信息（可能未刻入版本号或 GitHub 不可达），稍后再试。
          </p>
        ) : hasUpdate ? (
          <p className="mt-4 text-sm text-warm-accentDark">发现新版本，可以更新。</p>
        ) : (
          <p className="mt-4 text-sm text-warm-muted">已是最新版本。</p>
        )}

        {hasUpdate && !running ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setPassword("");
              setShowConfirm(true);
            }}
            className="mt-4 rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark"
          >
            立即更新
          </button>
        ) : null}
      </section>

      {running || status.state === "done" || status.state === "error" ? (
        <section className="rounded-card border border-warm-border bg-warm-surface p-5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status.state === "error"
                  ? "bg-red-500"
                  : status.state === "done"
                    ? "bg-green-500"
                    : "animate-pulse bg-warm-accent"
              }`}
            />
            <h2 className="font-serif text-lg font-semibold">{STATE_LABEL[status.state]}</h2>
          </div>

          {running ? (
            <p className="mt-3 text-sm text-warm-muted">
              {waiting
                ? "服务重启中，正在等待恢复…本页面短暂断开属正常现象。"
                : "更新进行中。重建并重启容器期间，网站会短暂中断约 1 分钟，届时本页面会自动恢复。"}
            </p>
          ) : null}

          {status.message ? (
            <p className="mt-2 text-sm text-warm-muted">{status.message}</p>
          ) : null}

          {status.log && status.log.length > 0 ? (
            <pre className="mt-4 max-h-72 overflow-auto rounded-[6px] bg-warm-background p-3 text-xs leading-relaxed text-warm-foreground">
              {status.log.join("\n")}
            </pre>
          ) : null}
        </section>
      ) : null}

      {hasUpdate && initialLog.length > 0 ? (
        <section className="rounded-card border border-warm-border bg-warm-surface p-5">
          <h2 className="font-serif text-lg font-semibold">更新日志</h2>
          <p className="mt-1 text-xs text-warm-muted">
            自当前版本以来的 {initialLog.length} 项改动
          </p>
          <ul className="mt-4 grid gap-2">
            {initialLog.map((c, i) => (
              <li
                key={`${c.sha}-${i}`}
                className="flex items-start gap-3 rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm"
              >
                <span className="mt-0.5 shrink-0 font-mono text-xs text-warm-muted">{c.sha}</span>
                <span className="flex-1">{c.message || "（无说明）"}</span>
                {c.date ? (
                  <span className="hidden shrink-0 text-xs text-warm-muted sm:inline">
                    {new Date(c.date).toLocaleDateString("zh-CN")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-card border border-warm-border bg-warm-surface p-6 shadow-lg">
            <h3 className="font-serif text-lg font-semibold">确认更新</h3>
            <p className="mt-2 text-sm text-warm-muted">
              将拉取最新代码并重建部署，网站会短暂中断约 1 分钟。请输入管理员密码确认。
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="管理员密码"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && password && !submitting) apply();
              }}
              className="mt-4 w-full rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-sm outline-none focus:border-warm-accent"
            />
            {error ? <p className="mt-2 text-sm text-warm-accentDark">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setPassword("");
                  setError(null);
                }}
                disabled={submitting}
                className="rounded-[6px] border border-warm-border px-4 py-2 text-sm text-warm-muted transition hover:text-warm-foreground disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={submitting || !password}
                className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark disabled:opacity-50"
              >
                {submitting ? "提交中…" : "确认更新"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

