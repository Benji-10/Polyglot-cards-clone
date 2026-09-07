import { NextRequest, NextResponse } from "next/server";
import { resolveServerUser } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/auth/me — returns the current resolved user (creates on first sight)
export async function GET(req: NextRequest) {
  const user = await resolveServerUser(req.headers);
  await db.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: user.name,
      netlifyId: user.netlifyId,
    },
    update: {
      email: user.email,
      name: user.name,
      netlifyId: user.netlifyId,
    },
  });
  return NextResponse.json(user);
}
