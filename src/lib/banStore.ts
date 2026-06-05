import fs from "node:fs/promises";
import { BANNED_IPS_FILE, DATA_DIR } from "./paths";

type BanRecord = {
  ip: string;
  bannedAt: string;
  failures: number;
};

let bannedCache: BanRecord[] | null = null;
let failuresCache: Map<string, number> | null = null;

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadBanned(): Promise<BanRecord[]> {
  if (bannedCache) return bannedCache;
  try {
    const text = await fs.readFile(BANNED_IPS_FILE, "utf8");
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      bannedCache = data as BanRecord[];
      return bannedCache;
    }
  } catch {}
  bannedCache = [];
  return bannedCache;
}

async function saveBanned(): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(BANNED_IPS_FILE, JSON.stringify(bannedCache ?? [], null, 2) + "\n", "utf8");
}

function getFailures(): Map<string, number> {
  if (!failuresCache) failuresCache = new Map();
  return failuresCache;
}

export async function isBanned(ip: string): Promise<boolean> {
  const banned = await loadBanned();
  return banned.some((r) => r.ip === ip);
}

export async function recordFailure(ip: string): Promise<void> {
  const failures = getFailures();
  const count = (failures.get(ip) ?? 0) + 1;
  failures.set(ip, count);

  if (count >= 5) {
    const banned = await loadBanned();
    if (!banned.some((r) => r.ip === ip)) {
      banned.push({ ip, bannedAt: new Date().toISOString(), failures: count });
      await saveBanned();
    }
  }
}

export async function clearFailures(ip: string): Promise<void> {
  const failures = getFailures();
  failures.delete(ip);
}
