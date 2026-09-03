import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";

const links: { href: string; label: string; superuserOnly?: boolean }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/leaders", label: "Leaders" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/work", label: "What we do" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/media", label: "Media library" },
  { href: "/admin/newsletter", label: "Newsletter", superuserOnly: true },
  { href: "/admin/settings", label: "Settings", superuserOnly: true },
  { href: "/admin/users", label: "Users", superuserOnly: true },
  { href: "/admin/audit-log", label: "Audit log", superuserOnly: true },
];

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  if (session.user.mustChangePassword) {
    redirect("/admin/change-password");
  }

  const role = session.user.role;

  return (
    <div className="min-h-screen flex bg-[#f7f5f0] text-[#0e0e10]">
      <aside className="w-60 shrink-0 border-r border-[#c8a24a]/30 p-6 flex flex-col gap-1">
        <p className="font-semibold mb-4">ACLIC Admin</p>
        <nav className="flex flex-col gap-1 text-sm">
          {links
            .filter((l) => !l.superuserOnly || role === "superuser")
            .map((l) => (
              <Link key={l.href} href={l.href} className="py-1.5 px-2 rounded hover:bg-[#c8a24a]/10">
                {l.label}
              </Link>
            ))}
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
          className="mt-auto pt-6"
        >
          <button type="submit" className="text-sm text-[#5a5e67] hover:text-[#0e0e10]">
            Sign out ({session.user.email})
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8 max-w-5xl">{children}</main>
    </div>
  );
}
