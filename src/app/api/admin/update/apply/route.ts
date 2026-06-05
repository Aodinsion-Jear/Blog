import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/adminStore";
import {
  getCurrentCommit,
  getLatestCommit,
  readUpdateStatus,
  isUpdateRunning,
  hasPendingRequest,
  writeUpdateRequest,
} from "@/lib/updater";

export const dynamic = "force-dynamic";

const ADMIN_USERNAME = "gzlyyds";

// 发起更新：二次校验密码后写入信号文件，由主机守护脚本执行。
export async function POST(req: Request) {
  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "需要管理员密码" }, { status: 400 });
  }

  // 即便已登录，触发部署仍要求重新输入密码（与删除文章一致），防止会话被借用或 CSRF。
  const ok = await verifyAdmin(ADMIN_USERNAME, password);
  if (!ok) {
    return NextResponse.json({ error: "密码错误" }, { status: 403 });
  }

  // 防止重复触发：已有更新在跑或已有待处理请求则拒绝。
  const status = await readUpdateStatus();
  if (isUpdateRunning(status) || (await hasPendingRequest())) {
    return NextResponse.json({ error: "已有更新正在进行" }, { status: 409 });
  }

  const latest = await getLatestCommit();
  if (!latest) {
    return NextResponse.json({ error: "无法获取最新版本，请稍后再试" }, { status: 502 });
  }

  const current = getCurrentCommit();
  if (current && current === latest) {
    return NextResponse.json({ error: "已是最新版本" }, { status: 409 });
  }

  try {
    await writeUpdateRequest(latest);
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  console.log(`[admin] update requested target=${latest}`);
  return NextResponse.json({ ok: true, target: latest }, { status: 202 });
}
