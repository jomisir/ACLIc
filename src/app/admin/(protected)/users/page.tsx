import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { setUserActive } from "@/actions/users";
import { CreateUserForm } from "./CreateUserForm";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user.role !== "superuser") redirect("/admin");

  const rows = await db.select().from(users);

  return (
    <div>
      <h1 className="text-2xl mb-6">Users</h1>
      <CreateUserForm />
      <ul className="border border-[#c8a24a]/30 rounded divide-y divide-[#c8a24a]/20 mt-8">
        {rows.map((u) => (
          <li key={u.id} className="flex items-center justify-between px-4 py-3 gap-4">
            <span className="text-sm">
              {u.name} — {u.email} <span className="text-xs text-[#5a5e67] ml-2">{u.role}</span>
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className={u.isActive ? "text-[#2e6b52]" : "text-[#5a5e67]"}>{u.isActive ? "active" : "disabled"}</span>
              {u.id !== session.user.id && (
                <form action={setUserActive.bind(null, u.id, !u.isActive)}>
                  <button className="underline">{u.isActive ? "Disable" : "Enable"}</button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
