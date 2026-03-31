import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, readdir } from "fs/promises";
import path from "path";

const WORKFLOWS_DIR = path.join(process.cwd(), "workflows");

export async function GET() {
  try {
    const files = await readdir(WORKFLOWS_DIR).catch(() => []);
    const workflows = [];
    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await readFile(path.join(WORKFLOWS_DIR, file), "utf-8");
        workflows.push(JSON.parse(content));
      }
    }
    return NextResponse.json(workflows);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mkdir } = await import("fs/promises");
    await mkdir(WORKFLOWS_DIR, { recursive: true });
    const filename = `${body.id}.json`;
    await writeFile(
      path.join(WORKFLOWS_DIR, filename),
      JSON.stringify(body, null, 2),
      "utf-8"
    );
    return NextResponse.json({ ok: true, filename });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const { unlink } = await import("fs/promises");
    await unlink(path.join(WORKFLOWS_DIR, `${id}.json`));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
