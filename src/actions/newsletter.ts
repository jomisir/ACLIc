"use server";

import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { isRateLimited } from "@/lib/rate-limit";
import { sendMail } from "@/lib/mail";

const schema = z.object({
  email: z.string().email().max(255),
  language: z.enum(["en", "am", "om"]),
  consent: z.literal(true, { message: "Consent is required." }),
  sourcePage: z.string().max(255),
  // Honeypot: real users never fill this in. Bots that fill every field do.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type NewsletterState = {
  status: "idle" | "success" | "error" | "already";
  message?: string;
};

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    language: formData.get("language"),
    consent: formData.get("consent") === "on",
    sourcePage: formData.get("sourcePage") ?? "unknown",
    website: formData.get("website") ?? "",
  });

  if (!parsed.success) {
    return { status: "error", message: "Please check the form and try again." };
  }

  if (parsed.data.website) {
    // Honeypot tripped — pretend success, do nothing.
    return { status: "success" };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited("newsletter_signup", ip, 5, 15)) {
    return { status: "error", message: "Too many attempts. Please try again later." };
  }

  const { email, language, sourcePage } = parsed.data;

  const [existing] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.email, email))
    .limit(1);

  if (existing) {
    if (existing.confirmedAt) {
      return { status: "already" };
    }
    // Unconfirmed already — resend the confirmation link.
    await sendConfirmation(email, existing.unsubscribeToken, language);
    return { status: "success" };
  }

  const unsubscribeToken = randomBytes(24).toString("hex");
  await db.insert(subscribers).values({
    email,
    language,
    sourcePage,
    unsubscribeToken,
  });

  await sendConfirmation(email, unsubscribeToken, language);

  return { status: "success" };
}

async function sendConfirmation(email: string, token: string, locale: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${base}/api/newsletter/confirm/${token}`;
  await sendMail(
    email,
    "Confirm your ACLIC updates subscription",
    `<p>Click to confirm: <a href="${confirmUrl}">${confirmUrl}</a></p>`,
    `Confirm your subscription: ${confirmUrl}`,
  );
  void locale;
}
