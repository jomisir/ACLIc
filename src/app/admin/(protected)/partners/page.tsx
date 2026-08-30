import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { partners } from "@/db/schema";

export default async function AdminPartnersList() {
  const rows = await db.select().from(partners).orderBy(asc(partners.displayOrder));

  return (
    <div>
      <h1 className="text-2xl mb-1">Partners</h1>
      <p className="text-sm text-[#5a5e67] mb-6">2 parent organizations + 13 placeholder slots. Empty slots stay hidden on the public site.</p>
      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <Link href={`/admin/partners/${p.id}`} className="hover:text-[#8a6b22]">
              #{p.displayOrder} — {p.name ?? "(empty slot)"} {p.isParentOrg && "· parent org"}
            </Link>
            <span className={`text-xs uppercase tracking-wide ${p.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
              {p.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
