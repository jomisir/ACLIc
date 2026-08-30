import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { auditLog, users } from "@/db/schema";

export default async function AdminAuditLogPage() {
  const session = await auth();
  if (session?.user.role !== "superuser") redirect("/admin");

  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      objectType: auditLog.objectType,
      objectId: auditLog.objectId,
      ip: auditLog.ip,
      createdAt: auditLog.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.userId))
    .orderBy(desc(auditLog.createdAt))
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl mb-6">Audit log</h1>
      <div className="overflow-x-auto border border-[#c8a24a]/30 rounded">
        <table className="w-full text-sm">
          <thead className="bg-[#c8a24a]/10 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Object</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-[#c8a24a]/20">
                <td className="px-3 py-2 whitespace-nowrap">{r.createdAt.toISOString()}</td>
                <td className="px-3 py-2">{r.actorEmail ?? "system"}</td>
                <td className="px-3 py-2">{r.action}</td>
                <td className="px-3 py-2">{r.objectType} {r.objectId}</td>
                <td className="px-3 py-2">{r.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
