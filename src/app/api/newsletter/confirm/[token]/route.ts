import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const [row] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  if (!row) {
    return NextResponse.redirect(`${base}/en?newsletter=invalid`);
  }

  if (!row.confirmedAt) {
    await db
      .update(subscribers)
      .set({ confirmedAt: new Date() })
      .where(eq(subscribers.unsubscribeToken, token));
  }

  return NextResponse.redirect(`${base}/${row.language}?newsletter=confirmed`);
}
