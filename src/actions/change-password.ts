"use server";

import { z } from "zod";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { writeAudit } from "@/auth/audit";
import { requestIp } from "@/auth/rbac";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(12, "Password must be at least 12 characters."),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  if (!user) redirect("/admin/login");

  const valid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await argon2.hash(parsed.data.newPassword);
  await db
    .update(users)
    .set({ passwordHash, mustChangePassword: false })
    .where(eq(users.id, user.id));

  await writeAudit({
    userId: user.id,
    action: "update",
    objectType: "user_password",
    objectId: user.id,
    ip: await requestIp(),
  });

  // Force a fresh session/JWT reflecting mustChangePassword: false.
  await signOut({ redirectTo: "/admin/login" });
  return {};
}
