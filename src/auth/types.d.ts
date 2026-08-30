import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "superuser" | "user";
    mustChangePassword: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: "superuser" | "user";
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "superuser" | "user";
    mustChangePassword: boolean;
  }
}
