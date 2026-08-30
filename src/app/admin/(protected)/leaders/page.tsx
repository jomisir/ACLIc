import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { leaders } from "@/db/schema";

export default async function AdminLeadersList() {
  const rows = await db.select().from(leaders).orderBy(asc(leaders.displayOrder));

  return (
    <div>
      <h1 className="text-2xl mb-6">Leaders</h1>
      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {rows.map((l) => (
          <li key={l.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <Link href={`/admin/leaders/${l.id}`} className="hover:text-[#8a6b22]">
              #{l.displayOrder} — {l.roleTitleEn} {l.fullName ? `— ${l.fullName}` : "(empty slot)"}
            </Link>
            <div className="flex items-center gap-3 text-xs">
              {!l.guardianConsent && <span className="text-amber-700">no consent recorded</span>}
              <span className={`uppercase tracking-wide ${l.status === "published" ? "text-[#2e6b52]" : "text-[#5a5e67]"}`}>
                {l.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
