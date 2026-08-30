"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="border border-[#c8a24a]/40 rounded px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="border border-[#c8a24a]/40 rounded px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-[#0e0e10] text-white rounded px-4 py-2 mt-2 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
    </form>
  );
}
