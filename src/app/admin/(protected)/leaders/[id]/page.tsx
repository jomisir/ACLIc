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
  clearLeaderProfile,
  uploadLeaderPhoto,
} from "@/actions/leaders";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
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
          <p className="text-sm font-medium mb-1">Role title</p>
          <p className="text-xs text-amber-800 mb-2 max-w-prose">
            <strong>Position name only — never a person&rsquo;s name.</strong> This field is
            published on the structure diagram and the home page as soon as it is saved, and
            it is deliberately <em>not</em> covered by the guardian-consent gate, because a
            position name is not personal data. Writing a name here would put that name in
            public with no consent check. Use &ldquo;Climate Action&rdquo;, not &ldquo;Climate
            Action &mdash; Abebe&rdquo;.
          </p>
          <LocaleTabs
            en={<input name="roleTitleEn" defaultValue={leader.roleTitleEn ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" />}
            am={<input name="roleTitleAm" defaultValue={leader.roleTitleAm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="am" />}
            om={<input name="roleTitleOm" defaultValue={leader.roleTitleOm ?? ""} className="w-full border border-[#c8a24a]/40 rounded px-3 py-2" lang="om" />}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Biography</p>
          <LocaleTabs
            en={<RichTextEditor name="bioEn" defaultValue={leader.bioEn ?? ""} />}
            am={<RichTextEditor name="bioAm" defaultValue={leader.bioAm ?? ""} lang="am" />}
            om={<RichTextEditor name="bioOm" defaultValue={leader.bioOm ?? ""} lang="om" />}
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
          {leader.guardianConsent && (
            <p className="text-xs text-[#5a5e67] mt-2">
              Revoking consent also unpublishes this profile immediately.
            </p>
          )}

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
          <div className="mt-8 border-t border-[#c8a24a]/30 pt-5">
            <h3 className="text-sm font-medium mb-1">Erase this profile</h3>
            <p className="text-xs text-[#5a5e67] mb-3 max-w-prose">
              Removes the name, biographies, photograph and recorded consent, and deletes
              the photo file from storage. The position and its place in the structure stay,
              so the slot is left empty and unpublished for whoever holds the role next.
              Use this when a guardian asks for the data to be removed rather than hidden —
              it cannot be undone.
            </p>
            <form action={clearLeaderProfile.bind(null, leader.id)}>
              <button type="submit" className="text-sm border border-red-700 text-red-700 rounded px-3 py-1.5">
                Erase profile data
              </button>
            </form>
          </div>

          {!leader.guardianConsent && leader.status === "draft" && (
            <p className="text-xs text-amber-700 mt-2">Publishing is blocked until guardian consent is recorded.</p>
          )}
        </div>
      )}
    </div>
  );
}
