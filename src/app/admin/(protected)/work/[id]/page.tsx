import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { workItems, workCategoryEnum } from "@/db/schema";
import { auth } from "@/auth";
import { updateWorkItem, publishWorkItem, unpublishWorkItem } from "@/actions/work-items";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const categoryLabels: Record<(typeof workCategoryEnum.enumValues)[number], string> = {
  training: "Trainings",
  campaign: "Campaigns",
  assembly: "General Assembly sessions",
  advocacy: "Advocacy submissions",
  partnership: "Partnerships",
};

const inputClass = "w-full border border-[#c8a24a]/40 rounded px-3 py-2";

export default async function EditWorkItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item] = await db.select().from(workItems).where(eq(workItems.id, id)).limit(1);
  if (!item) notFound();

  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/work" className="text-xs text-[#5a5e67] underline">← What we do</Link>
          <h1 className="text-2xl mt-1">{item.titleEn || "(untitled)"}</h1>
        </div>
        <span className={`text-xs uppercase tracking-wide ${item.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
          {item.status}
        </span>
      </div>

      <form action={updateWorkItem.bind(null, item.id)} className="flex flex-col gap-6">
        <div>
          <p className="text-sm font-medium mb-2">Category</p>
          <select name="category" defaultValue={item.category} required className="border border-[#c8a24a]/40 rounded px-3 py-2">
            {workCategoryEnum.enumValues.map((value) => (
              <option key={value} value={value}>{categoryLabels[value]}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Title</p>
          <LocaleTabs
            en={<input name="titleEn" defaultValue={item.titleEn ?? ""} className={inputClass} />}
            am={<input name="titleAm" defaultValue={item.titleAm ?? ""} className={inputClass} lang="am" />}
            om={<input name="titleOm" defaultValue={item.titleOm ?? ""} className={inputClass} lang="om" />}
          />
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Short summary</p>
          <LocaleTabs
            en={<RichTextEditor name="summaryEn" defaultValue={item.summaryEn ?? ""} />}
            am={<RichTextEditor name="summaryAm" defaultValue={item.summaryAm ?? ""} lang="am" />}
            om={<RichTextEditor name="summaryOm" defaultValue={item.summaryOm ?? ""} lang="om" />}
          />
        </div>

        <div className="flex gap-4 flex-wrap">
          <label className="text-sm">
            <span className="block text-xs text-[#5a5e67] mb-1">Date</span>
            <input name="occurredOn" type="date" defaultValue={item.occurredOn ?? ""} className="border border-[#c8a24a]/40 rounded px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-[#5a5e67] mb-1">Visibility</span>
            <select name="visibility" defaultValue={item.visibility} className="border border-[#c8a24a]/40 rounded px-3 py-2">
              <option value="internal">Internal</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>

        <button type="submit" className="self-start bg-[#0e0e10] text-white rounded px-4 py-2">
          Save changes
        </button>
      </form>

      {isSuperuser && (
        <div className="mt-6 flex gap-3">
          {item.status === "draft" ? (
            <form action={publishWorkItem.bind(null, item.id)}>
              <button type="submit" className="border border-[#2e6b52] text-[#2e6b52] rounded px-4 py-2">Publish</button>
            </form>
          ) : (
            <form action={unpublishWorkItem.bind(null, item.id)}>
              <button type="submit" className="border border-[#5a5e67] text-[#5a5e67] rounded px-4 py-2">Unpublish</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
