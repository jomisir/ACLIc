import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./LoginForm";

export default async function AdminLoginPage() {
  const session = await auth();
  if (session?.user) redirect("/admin");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#f7f5f0]">
      <div className="w-full max-w-sm border border-[#c8a24a]/40 rounded p-8">
        <h1 className="text-2xl mb-1">ACLIC Admin</h1>
        <p className="text-sm text-[#5a5e67] mb-6">Sign in to manage site content.</p>
        <LoginForm />
      </div>
    </main>
  );
}
