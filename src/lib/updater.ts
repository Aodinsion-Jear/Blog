import fs from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./paths";

const REPO = "Aodinsion-Jear/Blog";
const BRANCH = "main";
const GITHUB_API = "https://api.github.com";

export const UPDATE_REQUEST_FILE = path.join(DATA_DIR, "update.request");
export const UPDATE_STATUS_FILE = path.join(DATA_DIR, "update.status.json");

const SHA_PATTERN = /^[0-9a-f]{7,40}$/;
const RUNNING_STATES = ["pending", "pulling", "building", "restarting"];

export type CommitLogEntry = {
  sha: string;
  message: string;
  author: string;
  date: string;
};

export type UpdateState =
  | "idle"
  | "pending"
  | "pulling"
  | "building"
  | "restarting"
  | "done"
  | "error";

export type UpdateStatus = {
  state: UpdateState;
  message?: string;
  sha?: string;
  startedAt?: string;
  finishedAt?: string;
  log?: string[];
};

export function getCurrentCommit(): string | null {
  const sha = process.env.GIT_COMMIT?.trim();
  return sha && sha.length >= 7 ? sha : null;
}

async function githubFetch(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "blog-updater",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** GitHub 上 main 分支最新 commit 的 SHA；失败返回 null（不报红点）。 */
export async function getLatestCommit(): Promise<string | null> {
  const data = await githubFetch(`${GITHUB_API}/repos/${REPO}/commits/${BRANCH}`);
  const sha = (data as { sha?: unknown } | null)?.sha;
  return typeof sha === "string" && sha.length >= 7 ? sha : null;
}

/** 当前版本到最新版本之间的提交列表（更新日志）；失败返回空数组。 */
export async function getCommitLog(from: string, to: string): Promise<CommitLogEntry[]> {
  if (!from || !to || from === to) return [];
  const data = await githubFetch(`${GITHUB_API}/repos/${REPO}/compare/${from}...${to}`);
  const commits = (data as { commits?: unknown } | null)?.commits;
  if (!Array.isArray(commits)) return [];
  return commits
    .map((c) => {
      const commit = (c as { commit?: { message?: unknown; author?: { name?: unknown; date?: unknown } } }).commit;
      const sha = (c as { sha?: unknown }).sha;
      return {
        sha: typeof sha === "string" ? sha.slice(0, 7) : "",
        message: typeof commit?.message === "string" ? commit.message.split("\n")[0] : "",
        author: typeof commit?.author?.name === "string" ? commit.author.name : "",
        date: typeof commit?.author?.date === "string" ? commit.author.date : "",
      };
    })
    .reverse();
}

/** 读取主机守护脚本写回的状态；文件不存在时视为 idle。 */
export async function readUpdateStatus(): Promise<UpdateStatus> {
  try {
    const text = await fs.readFile(UPDATE_STATUS_FILE, "utf8");
    const data = JSON.parse(text) as UpdateStatus;
    if (typeof data?.state === "string") return data;
    return { state: "idle" };
  } catch {
    return { state: "idle" };
  }
}

export function isUpdateRunning(status: UpdateStatus): boolean {
  return RUNNING_STATES.includes(status.state);
}

/**
 * 写入「请求更新」信号文件，主机守护脚本会读取并执行。
 * 只写 commit SHA，不接受任何命令/分支/路径，杜绝注入。
 */
export async function writeUpdateRequest(sha: string): Promise<void> {
  if (!SHA_PATTERN.test(sha)) {
    throw new Error("invalid commit sha");
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  const payload = JSON.stringify({ sha, requestedAt: new Date().toISOString() }, null, 2) + "\n";
  await fs.writeFile(UPDATE_REQUEST_FILE, payload, "utf8");
}

export async function hasPendingRequest(): Promise<boolean> {
  try {
    await fs.access(UPDATE_REQUEST_FILE);
    return true;
  } catch {
    return false;
  }
}
