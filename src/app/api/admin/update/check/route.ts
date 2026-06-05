import { NextResponse } from "next/server";
import { getCurrentCommit, getLatestCommit, getCommitLog } from "@/lib/updater";

export const dynamic = "force-dynamic";

// 检测有无更新：对比当前镜像版本与 GitHub 最新版本。
export async function GET() {
  const current = getCurrentCommit();
  const latest = await getLatestCommit();

  // GitHub 不可达或镜像未刻入版本号时，静默不报更新，不影响后台使用。
  if (!current || !latest) {
    return NextResponse.json({
      current,
      latest,
      hasUpdate: false,
      available: Boolean(current && latest),
      log: [],
    });
  }

  const hasUpdate = current !== latest;
  const log = hasUpdate ? await getCommitLog(current, latest) : [];

  return NextResponse.json({
    current,
    latest,
    hasUpdate,
    available: true,
    log,
  });
}
