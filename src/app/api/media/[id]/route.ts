import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { media, leaders, partners, imageSlots, pages } from "@/db/schema";
import { downloadFromStorage } from "@/lib/storage";
import { auth } from "@/auth";

/**
 * Gated file serving: a media row is only returned if it is attached to
 * something published (a published leader photo, partner logo, or a
 * caption slot on a published page), or if the requester is a signed-in
 * admin previewing drafts. This is what keeps unpublished media out of
 * reach even though the underlying storage bucket is private.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  if (!row) return new NextResponse("Not found", { status: 404 });

  const session = await auth();
  if (session?.user) {
    return serve(row.filePath);
  }

  // Consent as well as publication — this route can otherwise hand out a
  // child's photograph after a guardian has withdrawn consent.
  const [leaderMatch] = await db
    .select({ status: leaders.status, guardianConsent: leaders.guardianConsent })
    .from(leaders)
    .where(eq(leaders.photoPath, row.filePath))
    .limit(1);
  if (leaderMatch?.status === "published" && leaderMatch.guardianConsent) {
    return serve(row.filePath);
  }

  const [partnerMatch] = await db
    .select({ status: partners.status })
    .from(partners)
    .where(eq(partners.logoPath, row.filePath))
    .limit(1);
  if (partnerMatch?.status === "published") return serve(row.filePath);

  const [slotMatch] = await db
    .select({ status: pages.status })
    .from(imageSlots)
    .innerJoin(pages, eq(pages.slug, imageSlots.pageSlug))
    .where(or(eq(imageSlots.mediaId, row.id)))
    .limit(1);
  if (slotMatch?.status === "published") return serve(row.filePath);

  return new NextResponse("Not found", { status: 404 });
}

async function serve(path: string) {
  const blob = await downloadFromStorage(path);
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
