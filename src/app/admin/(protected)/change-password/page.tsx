"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/actions/change-password";

export default function ChangePasswordPage() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changePasswordAction,
    {},
  );

  return (
    <div className="max-w-sm">
      <h1 className="text-2xl mb-2">Set a new password</h1>
      <p className="text-sm text-[#5a5e67] mb-6">
        This account must set a new password before continuing. Minimum 12 characters.
      </p>
      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="currentPassword" className="text-sm">Current password</label>
          <input id="currentPassword" name="currentPassword" type="password" required className="border border-[#c8a24a]/40 rounded px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="newPassword" className="text-sm">New password</label>
          <input id="newPassword" name="newPassword" type="password" required minLength={12} className="border border-[#c8a24a]/40 rounded px-3 py-2" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="confirmPassword" className="text-sm">Confirm new password</label>
          <input id="confirmPassword" name="confirmPassword" type="password" required minLength={12} className="border border-[#c8a24a]/40 rounded px-3 py-2" />
        </div>
        <button type="submit" disabled={pending} className="bg-[#0e0e10] text-white rounded px-4 py-2 disabled:opacity-50">
          {pending ? "Saving…" : "Set password and sign in again"}
        </button>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      </form>
    </div>
  );
}
