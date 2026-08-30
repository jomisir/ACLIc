import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { ExportButton } from "./ExportButton";

export default async function AdminNewsletterPage() {
  const session = await auth();
  if (session?.user.role !== "superuser") redirect("/admin");

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(subscribers);
  const [{ confirmed }] = await db
    .select({ confirmed: sql<number>`count(*) filter (where confirmed_at is not null)::int` })
    .from(subscribers);

  return (
    <div>
      <h1 className="text-2xl mb-6">Newsletter</h1>
      <p className="text-sm text-[#5a5e67] mb-6">{confirmed} confirmed of {total} total signups.</p>
      <ExportButton />
    </div>
  );
}
