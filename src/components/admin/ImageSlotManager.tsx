import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { imageSlots } from "@/db/schema";
import { IMAGE_SLOTS } from "@/lib/image-slots-config";
import { uploadImageSlot, setImageSlotCaption } from "@/actions/image-slots";
import { PhotoUploader as ImageSlotUploader } from "./PhotoUploader";
import { LocaleTabs } from "./LocaleTabs";

const captionClass = "w-full text-xs border border-[#c8a24a]/40 rounded px-2 py-1";

export async function ImageSlotManager({ pageSlug }: { pageSlug: string }) {
  const slots = IMAGE_SLOTS[pageSlug] ?? [];
  if (slots.length === 0) return null;

  return (
    <div className="mt-8 border-t border-[#c8a24a]/30 pt-6">
      <h2 className="text-lg mb-4">Image slots</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slots.map((slotKey) => (
          <SlotRow key={slotKey} pageSlug={pageSlug} slotKey={slotKey} />
        ))}
      </div>
    </div>
  );
}

async function SlotRow({ pageSlug, slotKey }: { pageSlug: string; slotKey: string }) {
  const [existing] = await db
    .select()
    .from(imageSlots)
    .where(and(eq(imageSlots.pageSlug, pageSlug), eq(imageSlots.slotKey, slotKey)))
    .limit(1);

  const boundUpload = uploadImageSlot.bind(null, pageSlug, slotKey);
  const boundCaption = setImageSlotCaption.bind(null, pageSlug, slotKey);

  return (
    <div className="border border-[#c8a24a]/30 rounded p-3">
      <p className="text-xs uppercase tracking-wide text-[#5a5e67] mb-2">{slotKey}</p>
      <ImageSlotUploader currentPath={existing?.mediaId ?? null} onUpload={boundUpload} />
      <form action={boundCaption} className="mt-2 flex flex-col gap-1">
        <LocaleTabs
          en={<input name="captionEn" defaultValue={existing?.captionEn ?? ""} className={captionClass} />}
          am={<input name="captionAm" defaultValue={existing?.captionAm ?? ""} lang="am" className={captionClass} />}
          om={<input name="captionOm" defaultValue={existing?.captionOm ?? ""} lang="om" className={captionClass} />}
        />
        <button type="submit" className="text-xs underline self-start">Save caption</button>
      </form>
    </div>
  );
}
