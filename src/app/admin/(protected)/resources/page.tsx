import { desc } from "drizzle-orm";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { auth } from "@/auth";
import { uploadResource, publishResource, unpublishResource, deleteResource } from "@/actions/resources";

export default async function AdminResourcesPage() {
  const rows = await db.select().from(resources).orderBy(desc(resources.createdAt));
  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <h1 className="text-2xl mb-1">Reports &amp; resources</h1>
      <p className="text-sm text-[#5a5e67] mb-6">Nothing is public until a superuser publishes it.</p>

      <form action={uploadResource} className="border border-[#c8a24a]/30 rounded p-4 mb-8 flex flex-col gap-4">
        <input name="titleEn" placeholder="Title (English)" required className="border border-[#c8a24a]/40 rounded px-3 py-2" />
        <input name="file" type="file" required />
        <select name="visibility" className="border border-[#c8a24a]/40 rounded px-3 py-2 w-fit">
          <option value="internal">Internal</option>
          <option value="public">Public</option>
        </select>
        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">Upload</button>
      </form>

      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <span className="text-sm">{r.titleEn} <span className="text-xs text-[#5a5e67] ml-2">{r.visibility}</span></span>
            <div className="flex items-center gap-3 text-xs">
              <span className={r.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}>{r.status}</span>
              {isSuperuser && (
                <>
                  {r.status === "draft" ? (
                    <form action={publishResource.bind(null, r.id)}><button className="underline">Publish</button></form>
                  ) : (
                    <form action={unpublishResource.bind(null, r.id)}><button className="underline">Unpublish</button></form>
                  )}
                  <form action={deleteResource.bind(null, r.id)}><button className="underline text-red-700">Delete</button></form>
                </>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-[#5a5e67]">Nothing uploaded yet.</li>}
      </ul>
    </div>
  );
}
