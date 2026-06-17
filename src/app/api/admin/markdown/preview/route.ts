import { NextResponse } from "next/server";
import { markdownToHtml } from "@/lib/markdown";

const MAX_CONTENT_LENGTH = 1024 * 1024;

export async function POST(req: Request) {
  let body: { content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "正文格式无效" }, { status: 400 });
  }

  if (body.content.length > MAX_CONTENT_LENGTH) {
    return NextResponse.json({ error: "正文不能超过 1MB" }, { status: 400 });
  }

  try {
    const html = await markdownToHtml(body.content);
    return NextResponse.json({ html });
  } catch (err) {
    console.error("[admin] markdown preview failed", err);
    return NextResponse.json({ error: "预览生成失败" }, { status: 500 });
  }
}
