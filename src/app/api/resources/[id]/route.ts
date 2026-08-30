import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { downloadFromStorage } from "@/lib/storage";
import { auth } from "@/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  if (!row || !row.filePath) return new NextResponse("Not found", { status: 404 });

  const session = await auth();
  const isPublic = row.status === "published" && row.visibility === "public";

  if (!isPublic && !session?.user) {
    return new NextResponse("Not found", { status: 404 });
  }

  const blob = await downloadFromStorage(row.filePath);
  return new NextResponse(blob, {
    headers: {
      "Content-Disposition": `attachment; filename="${row.filePath.split("/").pop()}"`,
      "Cache-Control": "private, max-age=0",
    },
  });
}
