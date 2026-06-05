"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/auth";
import { verifyAdmin } from "@/lib/adminStore";
import { isBanned, recordFailure, clearFailures } from "@/lib/banStore";

function getClientIp(headerStore: Headers): string {
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    "unknown"
  );
}

export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  if (await isBanned(ip)) {
    redirect("/login?error=banned");
  }

  const valid = await verifyAdmin(username, password);

  if (!valid) {
    await recordFailure(ip);
    if (await isBanned(ip)) {
      redirect("/login?error=banned");
    }
    redirect("/login?error=1");
  }

  await clearFailures(ip);

  const token = await signSession();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
