import fs from "node:fs/promises";
import { CATEGORIES_FILE } from "./paths";
import { sanitizeCategoryName } from "./paths";

export type CategoryRecord = {
  name: string;
  createdAt: string;
};

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function readCategoryFile(): Promise<CategoryRecord[]> {
  if (!(await fileExists(CATEGORIES_FILE))) return [];
  const text = await fs.readFile(CATEGORIES_FILE, "utf8");
  try {
    const parsed = JSON.parse(text) as CategoryRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CategoryRecord =>
        typeof item?.name === "string" && typeof item?.createdAt === "string",
    );
  } catch {
    return [];
  }
}

export async function writeCategoryFile(records: CategoryRecord[]): Promise<void> {
  await fs.writeFile(CATEGORIES_FILE, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

export async function ensureCategoryFile(deriveFrom: () => Promise<string[]>): Promise<void> {
  if (await fileExists(CATEGORIES_FILE)) return;
  const names = Array.from(new Set(await deriveFrom()));
  const now = new Date().toISOString();
  const records: CategoryRecord[] = names.map((name) => ({ name, createdAt: now }));
  await writeCategoryFile(records);
}

export async function addCategory(rawName: string): Promise<CategoryRecord> {
  const name = sanitizeCategoryName(rawName);
  const records = await readCategoryFile();
  if (records.some((r) => r.name === name)) {
    throw Object.assign(new Error("category already exists"), { code: "CONFLICT" });
  }
  const record: CategoryRecord = { name, createdAt: new Date().toISOString() };
  records.push(record);
  await writeCategoryFile(records);
  return record;
}

export async function deleteCategory(rawName: string): Promise<void> {
  const name = sanitizeCategoryName(rawName);
  const records = await readCategoryFile();
  const next = records.filter((r) => r.name !== name);
  if (next.length === records.length) {
    throw Object.assign(new Error("category not found"), { code: "NOT_FOUND" });
  }
  await writeCategoryFile(next);
}
