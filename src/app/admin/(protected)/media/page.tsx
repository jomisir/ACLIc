import { desc } from "drizzle-orm";
import { db } from "@/db";
import { media } from "@/db/schema";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { auth } from "@/auth";
import { updateMediaAlt, deleteMedia } from "@/actions/media";

export default async function AdminMediaPage() {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  const session = await auth();
  const isSuperuser = session?.user.role === "superuser";

  return (
    <div>
      <h1 className="text-2xl mb-1">Media library</h1>
      <p className="text-sm text-[#5a5e67] mb-6">
        Alt text describes the image for screen readers and is used wherever the image
        appears on the public site. Write it in all three languages.
      </p>
      <MediaUploader />
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {rows.map((m) => (
          <li key={m.id} className="border border-[#c8a24a]/30 rounded p-3">
            <img src={`/api/media/${m.id}`} alt={m.altEn ?? ""} className="w-full h-32 object-cover rounded mb-2" />
            <form action={updateMediaAlt.bind(null, m.id)} className="flex flex-col gap-1">
              <input name="altEn" defaultValue={m.altEn ?? ""} placeholder="Alt text (English)" className="text-xs border border-[#c8a24a]/40 rounded px-2 py-1" />
              <input name="altAm" defaultValue={m.altAm ?? ""} placeholder="Alt text (Amharic)" lang="am" className="text-xs border border-[#c8a24a]/40 rounded px-2 py-1" />
              <input name="altOm" defaultValue={m.altOm ?? ""} placeholder="Alt text (Afaan Oromoo)" className="text-xs border border-[#c8a24a]/40 rounded px-2 py-1" />
              <button type="submit" className="text-xs underline self-start">Save alt text</button>
            </form>
            {isSuperuser && (
              <form action={deleteMedia.bind(null, m.id)} className="mt-2">
                <button type="submit" className="text-xs underline text-red-700">Delete image</button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="text-sm text-[#5a5e67]">No media uploaded yet.</p>}
    </div>
  );
}
