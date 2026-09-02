import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { auth } from "@/auth";
import { updateResource, publishResource, unpublishResource } from "@/actions/resources";
import { LocaleTabs } from "@/components/admin/LocaleTabs";

const inputClass = "w-full border border-[#c8a24a]/40 rounded px-3 py-2";

function formatSize(bytes: number | null) {
  if (!bytes) return "unknown size";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [resource] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  if (!resource) notFound();

  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/resources" className="text-xs text-[#5a5e67] underline">← Reports &amp; resources</Link>
          <h1 className="text-2xl mt-1">{resource.titleEn || "(untitled)"}</h1>
        </div>
        <span className={`text-xs uppercase tracking-wide ${resource.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
          {resource.status}
        </span>
      </div>

      <p className="text-sm text-[#5a5e67] mb-6">
        File: <span className="font-mono text-xs">{resource.filePath ?? "(none)"}</span> · {formatSize(resource.fileSize)}
        <br />
        The file itself cannot be swapped here — delete this entry and upload again if the document changed.
      </p>

      <form action={updateResource.bind(null, resource.id)} className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium mb-2">Title</p>
          <LocaleTabs
            en={<input name="titleEn" defaultValue={resource.titleEn ?? ""} className={inputClass} />}
            am={<input name="titleAm" defaultValue={resource.titleAm ?? ""} className={inputClass} lang="am" />}
            om={<input name="titleOm" defaultValue={resource.titleOm ?? ""} className={inputClass} lang="om" />}
          />
        </div>

        <label className="text-sm">
          <span className="block text-xs text-[#5a5e67] mb-1">Visibility</span>
          <select name="visibility" defaultValue={resource.visibility} className="border border-[#c8a24a]/40 rounded px-3 py-2">
            <option value="internal">Internal</option>
            <option value="public">Public</option>
          </select>
        </label>

        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">Save changes</button>
      </form>

      {isSuperuser && (
        <div className="mt-6 flex gap-3">
          {resource.status === "draft" ? (
            <form action={publishResource.bind(null, resource.id)}>
              <button type="submit" className="border border-[#2e6b52] text-[#2e6b52] rounded px-4 py-2">Publish</button>
            </form>
          ) : (
            <form action={unpublishResource.bind(null, resource.id)}>
              <button type="submit" className="border border-[#5a5e67] text-[#5a5e67] rounded px-4 py-2">Unpublish</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
