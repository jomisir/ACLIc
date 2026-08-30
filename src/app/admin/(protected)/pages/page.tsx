import Link from "next/link";
import { db } from "@/db";
import { pages } from "@/db/schema";

export default async function AdminPagesList() {
  const rows = await db.select().from(pages);

  return (
    <div>
      <h1 className="text-2xl mb-6">Pages</h1>
      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {rows.map((p) => (
          <li key={p.slug} className="flex items-center justify-between px-4 py-3">
            <Link href={`/admin/pages/${p.slug}`} className="hover:text-[#8a6b22]">
              /{p.slug}
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
