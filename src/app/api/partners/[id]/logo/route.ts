import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { downloadFromStorage } from "@/lib/storage";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!row || !row.logoPath) return new NextResponse("Not found", { status: 404 });

  const session = await auth();
  if (row.status !== "published" && !session?.user) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await downloadFromStorage(row.logoPath);
  return new NextResponse(blob, {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=3600" },
  });
}
