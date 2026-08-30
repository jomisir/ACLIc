import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { auth } from "@/auth";
import { saveDraftPage, publishPage, unpublishPage } from "@/actions/pages";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { ImageSlotManager } from "@/components/admin/ImageSlotManager";

export default async function EditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!page) notFound();

  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">/{page.slug}</h1>
        <span className={`text-xs uppercase tracking-wide ${page.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
          {page.status}
        </span>
      </div>

      <form action={saveDraftPage} className="flex flex-col gap-6">
        <input type="hidden" name="slug" value={page.slug} />

        <div>
          <p className="text-sm font-medium mb-2">Title</p>
          <LocaleTabs
            en={<input name="titleEn" defaultValue={page.titleEn ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
            am={<input name="titleAm" defaultValue={page.titleAm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="am" />}
            om={<input name="titleOm" defaultValue={page.titleOm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Body</p>
          <LocaleTabs
            en={<textarea name="bodyEn" rows={10} defaultValue={page.bodyEn ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
            am={<textarea name="bodyAm" rows={10} defaultValue={page.bodyAm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="am" />}
            om={<textarea name="bodyOm" rows={10} defaultValue={page.bodyOm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
          />
        </div>

        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">
          Save draft
        </button>
      </form>

      {isSuperuser && (
        <div className="mt-6 flex gap-3">
          {page.status === "draft" ? (
            <form action={publishPage.bind(null, page.slug)}>
              <button type="submit" className="border border-[#2e6b52] text-[#2e6b52] rounded px-4 py-2">
                Publish
              </button>
            </form>
          ) : (
            <form action={unpublishPage.bind(null, page.slug)}>
              <button type="submit" className="border border-[#5a5e67] text-[#5a5e67] rounded px-4 py-2">
                Unpublish
              </button>
            </form>
          )}
        </div>
      )}

      <ImageSlotManager pageSlug={page.slug} />
    </div>
  );
}
