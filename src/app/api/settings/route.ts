import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

// GET /api/settings — fetch cloud-synced settings (merged with defaults)
export async function GET(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  const rows = await db.userSetting.findMany({ where: { userId: user.id } });
  const stored: Record<string, string> = {};
  for (const r of rows) stored[r.key] = r.value;
  // Merge the single "app" JSON blob if present
  let settings: AppSettings = { ...DEFAULT_SETTINGS };
  if (stored.app) {
    try {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored.app) };
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json(settings);
}

// PUT /api/settings — save the full settings object
export async function PUT(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  const body = await req.json().catch(() => ({}));
  const value = JSON.stringify({ ...DEFAULT_SETTINGS, ...body });
  await db.userSetting.upsert({
    where: { userId_key: { userId: user.id, key: "app" } },
    create: { userId: user.id, key: "app", value },
    update: { value },
  });
  return NextResponse.json({ ok: true });
}
