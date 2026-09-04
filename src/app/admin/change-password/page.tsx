import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

/**
 * Deliberately OUTSIDE the (protected) route group.
 *
 * That layout redirects to this page whenever `mustChangePassword` is set. If
 * this page sat inside the group, the layout would run for it too and redirect
 * to itself — an infinite loop that returns 200 with an empty document. Every
 * account is created with `mustChangePassword: true`, so that loop made it
 * impossible for any new administrator to sign in at all.
 *
 * The sidebar is intentionally absent as well: until the password is changed
 * there is nowhere else to go.
 */
export default async function ChangePasswordPage() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  return <ChangePasswordForm />;
}
