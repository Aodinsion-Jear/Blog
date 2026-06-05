import fs from "node:fs/promises";
import crypto from "node:crypto";
import { ADMIN_FILE, DATA_DIR } from "./paths";

type AdminRecord = {
  username: string;
  salt: string;
  passwordHash: string;
};

function hashPassword(password: string, salt: string): string {
  return crypto.createHash("sha256").update(salt + password).digest("hex");
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readAdminFile(): Promise<AdminRecord | null> {
  try {
    const text = await fs.readFile(ADMIN_FILE, "utf8");
    const data = JSON.parse(text) as AdminRecord;
    if (data.username && data.salt && data.passwordHash) return data;
    return null;
  } catch {
    return null;
  }
}

export async function initAdmin(): Promise<void> {
  await ensureDataDir();
  const existing = await readAdminFile();
  if (existing) return;

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error("ADMIN_PASSWORD 未设置，无法初始化管理员账户");
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const record: AdminRecord = {
    username: "gzlyyds",
    salt,
    passwordHash: hashPassword(password, salt),
  };

  await fs.writeFile(ADMIN_FILE, JSON.stringify(record, null, 2) + "\n", "utf8");
}

export async function verifyAdmin(username: string, password: string): Promise<boolean> {
  await initAdmin();
  const admin = await readAdminFile();
  if (!admin) return false;

  if (username !== admin.username) return false;

  const hash = hashPassword(password, admin.salt);
  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex"),
    Buffer.from(admin.passwordHash, "hex"),
  );
}
