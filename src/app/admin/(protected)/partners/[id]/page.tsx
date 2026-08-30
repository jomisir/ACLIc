import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { partners } from "@/db/schema";
import { auth } from "@/auth";
import { saveDraftPartner, publishPartner, unpublishPartner, uploadPartnerLogo } from "@/actions/partners";
import { PhotoUploader } from "@/components/admin/PhotoUploader";

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [partner] = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  if (!partner) notFound();

  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";
  const boundUpload = uploadPartnerLogo.bind(null, partner.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Partner #{partner.displayOrder}</h1>
        <span className={`text-xs uppercase tracking-wide ${partner.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
          {partner.status}
        </span>
      </div>

      <PhotoUploader currentPath={partner.logoPath} onUpload={boundUpload} />

      <form action={saveDraftPartner} className="flex flex-col gap-6 mt-6">
        <input type="hidden" name="id" value={partner.id} />
        <input type="hidden" name="displayOrder" value={partner.displayOrder} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Organization name</label>
          <input name="name" defaultValue={partner.name ?? ""} disabled={partner.isParentOrg} className="border border-[#c8a24a]/40 rounded px-3 py-2 disabled:opacity-60" />
          {partner.isParentOrg && <p className="text-xs text-[#5a5e67]">Parent organization name is fixed.</p>}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Website URL (optional)</label>
          <input name="url" type="url" defaultValue={partner.url ?? ""} className="border border-[#c8a24a]/40 rounded px-3 py-2" />
        </div>
        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">
          Save draft
        </button>
      </form>

      {isSuperuser && (
        <div className="mt-8 flex gap-3">
          {partner.status === "draft" ? (
            <form action={publishPartner.bind(null, partner.id)}>
              <button type="submit" className="border border-[#2e6b52] text-[#2e6b52] rounded px-4 py-2">
                Publish
              </button>
            </form>
          ) : (
            <form action={unpublishPartner.bind(null, partner.id)}>
              <button type="submit" className="border border-[#5a5e67] text-[#5a5e67] rounded px-4 py-2">
                Unpublish
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
