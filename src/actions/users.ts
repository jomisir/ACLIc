"use server";

import { z } from "zod";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole, requestIp } from "@/auth/rbac";
import { writeAudit } from "@/auth/audit";

const schema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.enum(["superuser", "user"]),
});

export type CreateUserState = { error?: string; tempPassword?: string };

export async function createUser(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const admin = await requireRole("superuser");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const tempPassword = randomBytes(9).toString("base64url"); // >= 12 chars
  const passwordHash = await argon2.hash(tempPassword);

  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    passwordHash,
    role: parsed.data.role,
    mustChangePassword: true,
  });

  await writeAudit({ userId: admin.id, action: "create", objectType: "user", objectId: parsed.data.email, ip: await requestIp() });
  revalidatePath("/admin/users");

  return { tempPassword };
}

export async function setUserActive(id: string, isActive: boolean) {
  const admin = await requireRole("superuser");
  await db.update(users).set({ isActive }).where(eq(users.id, id));
  await writeAudit({
    userId: admin.id,
    action: isActive ? "update" : "disable",
    objectType: "user",
    objectId: id,
    ip: await requestIp(),
  });
  revalidatePath("/admin/users");
}
