import "server-only";
import { headers } from "next/headers";
import { auth } from "@/auth";

export type Role = "superuser" | "user";

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Call this at the top of EVERY admin server action and admin route segment.
 * Middleware alone is not sufficient — a server action is an independently
 * callable endpoint and must check the role itself.
 */
export async function requireRole(...allowed: Role[]) {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  const role = session.user.role as Role;
  if (!allowed.includes(role)) {
    throw new ForbiddenError(`Requires one of: ${allowed.join(", ")}`);
  }
  return session.user;
}

export async function requestIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}
