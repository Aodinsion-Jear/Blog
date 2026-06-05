"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/login/actions";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => logoutAction())}
      className="text-sm text-warm-muted transition hover:text-warm-accentDark disabled:opacity-50"
    >
      {pending ? "退出中…" : "退出登录"}
    </button>
  );
}
