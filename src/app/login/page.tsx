import type { Metadata } from "next";
import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "登录",
};

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorCode = params?.error;
  const errorMessage =
    errorCode === "rate"
      ? "尝试次数过多，请稍后再试。"
      : errorCode === "banned"
        ? "该 IP 已被永久禁止登录。"
        : errorCode
          ? "账户或密码错误。"
          : null;

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-12">
      <div className="rounded-card border border-warm-border bg-warm-surface p-8 shadow-sm">
        <p className="mb-2 text-sm text-warm-accentDark">Admin</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em] text-warm-foreground">
          登录后台
        </h1>
        <p className="mt-3 text-sm text-warm-muted">输入管理员账户和密码进入文章与分类管理。</p>

        <form action={loginAction} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm text-warm-foreground">
            <span>账户</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              required
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-base text-warm-foreground outline-none focus:border-warm-accent"
            />
          </label>
          <label className="grid gap-2 text-sm text-warm-foreground">
            <span>密码</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="rounded-[6px] border border-warm-border bg-warm-background px-3 py-2 text-base text-warm-foreground outline-none focus:border-warm-accent"
            />
          </label>
          {errorMessage ? (
            <p className="text-sm text-warm-accentDark">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            className="rounded-[6px] bg-warm-accent px-4 py-2 text-sm font-medium text-warm-surface transition hover:bg-warm-accentDark"
          >
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
