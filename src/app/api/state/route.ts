import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const STATE_FILE = path.join(process.cwd(), "workflows", "app-state.json");
const WORKFLOWS_DIR = path.join(process.cwd(), "workflows");

export async function GET() {
  try {
    const content = await readFile(STATE_FILE, "utf-8");
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await mkdir(WORKFLOWS_DIR, { recursive: true });
    await writeFile(STATE_FILE, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
