import { UpdatePanel } from "./UpdatePanel";
import {
  getCurrentCommit,
  getLatestCommit,
  getCommitLog,
  readUpdateStatus,
} from "@/lib/updater";

export const dynamic = "force-dynamic";

export default async function AdminUpdatePage() {
  const current = getCurrentCommit();
  const latest = await getLatestCommit();
  const hasUpdate = Boolean(current && latest && current !== latest);
  const log = hasUpdate && current && latest ? await getCommitLog(current, latest) : [];
  const status = await readUpdateStatus();

  return (
    <div className="grid gap-8">
      <header>
        <p className="mb-2 text-sm text-warm-accentDark">System</p>
        <h1 className="font-serif text-3xl font-semibold tracking-[-0.03em]">系统更新</h1>
        <p className="mt-3 text-sm text-warm-muted">
          从 GitHub 拉取最新代码并重新部署。更新只影响程序代码，不会动到你的文章和分类。
        </p>
      </header>

      <UpdatePanel
        current={current}
        latest={latest}
        hasUpdate={hasUpdate}
        available={Boolean(current && latest)}
        initialLog={log}
        initialStatus={status}
      />
    </div>
  );
}
