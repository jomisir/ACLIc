import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { leaders } from "@/db/schema";
import { auth } from "@/auth";
import {
  saveDraftLeader,
  publishLeader,
  unpublishLeader,
  setGuardianConsent,
  uploadLeaderPhoto,
} from "@/actions/leaders";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { PhotoUploader } from "@/components/admin/PhotoUploader";

export default async function EditLeaderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [leader] = await db.select().from(leaders).where(eq(leaders.id, id)).limit(1);
  if (!leader) notFound();

  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";
  const boundUpload = uploadLeaderPhoto.bind(null, leader.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl">Leader #{leader.displayOrder}</h1>
        <span className={`text-xs uppercase tracking-wide ${leader.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
          {leader.status}
        </span>
      </div>

      <PhotoUploader currentPath={leader.photoPath} onUpload={boundUpload} />

      <form action={saveDraftLeader} className="flex flex-col gap-6 mt-6">
        <input type="hidden" name="id" value={leader.id} />
        <input type="hidden" name="displayOrder" value={leader.displayOrder} />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Full name</label>
          <input name="fullName" defaultValue={leader.fullName} className="border border-[#c8a24a]/40 rounded px-3 py-2" />
          <p className="text-xs text-[#5a5e67]">
            No date of birth, school, neighbourhood, or personal contact details — those fields do not exist on this form by design.
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Role title</p>
          <LocaleTabs
            en={<input name="roleTitleEn" defaultValue={leader.roleTitleEn ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
            am={<input name="roleTitleAm" defaultValue={leader.roleTitleAm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="am" />}
            om={<input name="roleTitleOm" defaultValue={leader.roleTitleOm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Biography</p>
          <LocaleTabs
            en={<textarea name="bioEn" rows={6} defaultValue={leader.bioEn ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
            am={<textarea name="bioAm" rows={6} defaultValue={leader.bioAm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="am" />}
            om={<textarea name="bioOm" rows={6} defaultValue={leader.bioOm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
          />
        </div>

        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">
          Save draft
        </button>
      </form>

      {isSuperuser && (
        <div className="mt-8 border-t border-[#c8a24a]/30 pt-6">
          <h2 className="text-lg mb-3">Safeguarding</h2>
          <form action={setGuardianConsent.bind(null, leader.id, !leader.guardianConsent)} className="flex items-center gap-3">
            <span className="text-sm">
              Guardian consent: <strong>{leader.guardianConsent ? `recorded (${leader.consentDate})` : "not recorded"}</strong>
            </span>
            <button type="submit" className="text-sm border border-[#c8a24a]/40 rounded px-3 py-1.5">
              {leader.guardianConsent ? "Revoke consent" : "Record consent"}
            </button>
          </form>

          <div className="flex gap-3 mt-6">
            {leader.status === "draft" ? (
              <form action={publishLeader.bind(null, leader.id)}>
                <button type="submit" className="border border-[#2e6b52] text-[#2e6b52] rounded px-4 py-2">
                  Publish
                </button>
              </form>
            ) : (
              <form action={unpublishLeader.bind(null, leader.id)}>
                <button type="submit" className="border border-[#5a5e67] text-[#5a5e67] rounded px-4 py-2">
                  Unpublish this profile
                </button>
              </form>
            )}
          </div>
          {!leader.guardianConsent && leader.status === "draft" && (
            <p className="text-xs text-amber-700 mt-2">Publishing is blocked until guardian consent is recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
