import { desc } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { workItems } from "@/db/schema";
import { auth } from "@/auth";
import { createWorkItem, publishWorkItem, unpublishWorkItem, deleteWorkItem } from "@/actions/work-items";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const categories = [
  ["training", "Trainings"],
  ["campaign", "Campaigns"],
  ["assembly", "General Assembly sessions"],
  ["advocacy", "Advocacy submissions"],
  ["partnership", "Partnerships"],
] as const;

const inputClass = "w-full border border-[#c8a24a]/40 rounded px-3 py-2";

export default async function AdminWorkPage() {
  const rows = await db.select().from(workItems).orderBy(desc(workItems.updatedAt));
  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <h1 className="text-2xl mb-6">What we do</h1>

      <form action={createWorkItem} className="border border-[#c8a24a]/30 rounded p-4 mb-8 flex flex-col gap-4">
        <p className="text-sm font-medium">Add an item (category-level only — no confidential program detail)</p>
        <select name="category" required className="border border-[#c8a24a]/40 rounded px-3 py-2">
          {categories.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <div>
          <p className="text-sm font-medium mb-2">Title</p>
          <LocaleTabs
            en={<input name="titleEn" className={inputClass} />}
            am={<input name="titleAm" className={inputClass} lang="am" />}
            om={<input name="titleOm" className={inputClass} lang="om" />}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Short summary</p>
          <LocaleTabs
            en={<RichTextEditor name="summaryEn" defaultValue="" />}
            am={<RichTextEditor name="summaryAm" defaultValue="" lang="am" />}
            om={<RichTextEditor name="summaryOm" defaultValue="" lang="om" />}
          />
        </div>

        <input name="occurredOn" type="date" className="border border-[#c8a24a]/40 rounded px-3 py-2 w-fit" />
        <select name="visibility" className="border border-[#c8a24a]/40 rounded px-3 py-2 w-fit">
          <option value="internal">Internal</option>
          <option value="public">Public</option>
        </select>
        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">Add item</button>
      </form>

      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {rows.map((w) => (
          <li key={w.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <div className="text-sm">
              <span className="uppercase text-xs text-[#5a5e67] mr-2">{w.category}</span>
              {w.titleEn || "(untitled)"}
              <span className="ml-2 text-xs text-[#5a5e67]">{w.visibility}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={w.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}>{w.status}</span>
              <Link href={`/admin/work/${w.id}`} className="underline">Edit</Link>
              {isSuperuser && (
                <>
                  {w.status === "draft" ? (
                    <form action={publishWorkItem.bind(null, w.id)}><button className="underline">Publish</button></form>
                  ) : (
                    <form action={unpublishWorkItem.bind(null, w.id)}><button className="underline">Unpublish</button></form>
                  )}
                  <form action={deleteWorkItem.bind(null, w.id)}><button className="underline text-red-700">Delete</button></form>
                </>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-[#5a5e67]">Nothing yet.</li>}
      </ul>
    </div>
  );
}
