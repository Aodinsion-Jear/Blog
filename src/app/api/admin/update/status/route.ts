import { NextResponse } from "next/server";
import { readUpdateStatus } from "@/lib/updater";

export const dynamic = "force-dynamic";

// 透传主机守护脚本写回的状态，供前端轮询。
export async function GET() {
  const status = await readUpdateStatus();
  // 限制日志体积，避免状态文件异常膨胀时拖垮响应。
  const log = Array.isArray(status.log) ? status.log.slice(-200) : [];
  return NextResponse.json({ ...status, log });
}
