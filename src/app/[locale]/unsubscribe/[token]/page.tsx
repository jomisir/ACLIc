import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const t = await getTranslations("Unsubscribe");

  const [row] = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.unsubscribeToken, token))
    .limit(1);

  if (!row) {
    return (
      <main className="mx-auto max-w-[1180px] px-6 py-24">
        <p className="measure">{t("error")}</p>
      </main>
    );
  }

  await db.delete(subscribers).where(eq(subscribers.unsubscribeToken, token));

  return (
    <main className="mx-auto max-w-[1180px] px-6 py-24">
      <h1 className="text-3xl mb-4">{t("heading")}</h1>
      <p className="measure text-muted">{t("body")}</p>
    </main>
  );
}
