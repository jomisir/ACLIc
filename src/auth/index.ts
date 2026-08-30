import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";
import { writeAudit } from "./audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 hours idle expiry
    updateAge: 0,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? "");

        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

        if (await isRateLimited("login", ip, 5, 15)) {
          await writeAudit({ userId: null, action: "login_blocked", objectType: "user", objectId: email, ip });
          throw new Error("Too many login attempts. Try again in 15 minutes.");
        }

        if (!email || !password) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.isActive) {
          await writeAudit({ userId: null, action: "login_failed", objectType: "user", objectId: email, ip });
          return null;
        }

        const valid = await argon2.verify(user.passwordHash, password);
        if (!valid) {
          await writeAudit({ userId: user.id, action: "login_failed", objectType: "user", objectId: user.id, ip });
          return null;
        }

        await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
        await writeAudit({ userId: user.id, action: "login", objectType: "user", objectId: user.id, ip });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "superuser" | "user";
        session.user.mustChangePassword = token.mustChangePassword as boolean;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Host-aclic-session" : "aclic-session",
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
});
