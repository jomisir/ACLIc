import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { pages, leaders, partners, workItems, resources } from "@/db/schema";

export default async function AdminDashboard() {
  const session = await auth();

  const [draftPages, draftLeaders, draftPartners, draftWork, draftResources] = await Promise.all([
    db.select().from(pages).where(eq(pages.status, "draft")),
    db.select().from(leaders).where(eq(leaders.status, "draft")),
    db.select().from(partners).where(eq(partners.status, "draft")),
    db.select().from(workItems).where(eq(workItems.status, "draft")),
    db.select().from(resources).where(eq(resources.status, "draft")),
  ]);

  const queue = [
    { label: "Pages", count: draftPages.filter((p) => p.titleEn || p.bodyEn).length, href: "/admin/pages" },
    { label: "Leaders", count: draftLeaders.filter((l) => l.fullName).length, href: "/admin/leaders" },
    { label: "Partners", count: draftPartners.filter((p) => p.name).length, href: "/admin/partners" },
    { label: "What we do", count: draftWork.length, href: "/admin/work" },
    { label: "Resources", count: draftResources.length, href: "/admin/resources" },
  ];

  return (
    <div>
      <h1 className="text-2xl mb-1">Dashboard</h1>
      <p className="text-sm text-[#5a5e67] mb-8">Signed in as {session?.user?.email} ({session?.user?.role})</p>

      <h2 className="text-lg mb-3">Pending review</h2>
      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20">
        {queue.map((q) => (
          <li key={q.label} className="flex items-center justify-between px-4 py-3">
            <a href={q.href} className="hover:text-[#8a6b22]">{q.label}</a>
            <span className="text-sm text-[#5a5e67]">{q.count} with content, in draft</span>
          </li>
        ))}
      </ul>

      {session?.user?.role !== "superuser" && (
        <p className="text-sm text-[#5a5e67] mt-6">
          You can create and edit drafts. Publishing, deleting, and exporting subscriber data require a superuser.
        </p>
      )}
    </div>
  );
}
