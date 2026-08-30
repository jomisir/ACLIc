"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "@/actions/users";

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<CreateUserState, FormData>(createUser, {});

  return (
    <form action={formAction} className="border border-[#c8a24a]/30 rounded p-4 flex flex-col gap-4 max-w-sm">
      <p className="text-sm font-medium">Create a user</p>
      <input name="name" placeholder="Name" required className="border border-[#c8a24a]/40 rounded px-3 py-2" />
      <input name="email" type="email" placeholder="Email" required className="border border-[#c8a24a]/40 rounded px-3 py-2" />
      <select name="role" className="border border-[#c8a24a]/40 rounded px-3 py-2">
        <option value="user">Editor (user)</option>
        <option value="superuser">Superuser</option>
      </select>
      <button type="submit" disabled={pending} className="self-start bg-[#0e0e10] text-white rounded px-4 py-2 disabled:opacity-50">
        Create
      </button>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.tempPassword && (
        <p className="text-sm bg-[#c8a24a]/10 p-3 rounded">
          Account created. Temporary password (shown once): <code>{state.tempPassword}</code>. The user must change it on first login.
        </p>
      )}
    </form>
  );
}
