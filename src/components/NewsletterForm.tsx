"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/actions/newsletter";
import type { Locale } from "@/i18n/routing";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm({
  sourcePage,
  locale,
  labels,
}: {
  sourcePage: string;
  locale: Locale;
  labels: {
    emailLabel: string;
    consentLabel: string;
    submit: string;
    success: string;
    already: string;
    error: string;
  };
}) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <input type="hidden" name="sourcePage" value={sourcePage} />
      <input type="hidden" name="language" value={locale} />

      {/* Honeypot — hidden from sighted users, visible to bots that fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px]">
        <label htmlFor="website">Website</label>
        <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="newsletter-email" className="text-sm">
          {labels.emailLabel}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          className="border border-gold/40 rounded px-3 py-2 bg-transparent focus-visible:border-gold"
        />
      </div>

      <div className="flex items-start gap-2">
        <input
          id="newsletter-consent"
          name="consent"
          type="checkbox"
          required
          className="mt-1"
        />
        <label htmlFor="newsletter-consent" className="text-sm text-muted">
          {labels.consentLabel}
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start border border-gold text-gold-deep dark:text-gold px-4 py-2 rounded hover:bg-gold/10 transition-colors duration-150 disabled:opacity-50"
      >
        {labels.submit}
      </button>

      {state.status === "success" && (
        <p role="status" className="text-green text-sm">
          {labels.success}
        </p>
      )}
      {state.status === "already" && (
        <p role="status" className="text-sm text-muted">
          {labels.already}
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {state.message ?? labels.error}
        </p>
      )}
    </form>
  );
}
