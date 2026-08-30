import "dotenv/config";
import { randomBytes } from "node:crypto";
import argon2 from "argon2";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const {
  users,
  pages,
  leaders,
  partners,
  settings,
} = schema;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  // --- Superuser from environment ---
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "ACLIC Administrator";

  if (adminEmail && adminPassword) {
    const passwordHash = await argon2.hash(adminPassword);
    await db
      .insert(users)
      .values({
        name: adminName,
        email: adminEmail,
        passwordHash,
        role: "superuser",
        isActive: true,
        mustChangePassword: true,
      })
      .onConflictDoNothing({ target: users.email });
    console.log(`Superuser ensured: ${adminEmail}`);
  } else {
    console.warn(
      "ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping superuser creation. Set them in .env and re-run.",
    );
  }

  // --- Pages: one empty record per public route ---
  const pageSlugs = [
    "home",
    "about",
    "structure",
    "leaders",
    "work",
    "partners",
    "membership",
    "resources",
    "contact",
    "privacy",
    "safeguarding",
  ];
  for (const slug of pageSlugs) {
    await db.insert(pages).values({ slug, status: "draft" }).onConflictDoNothing({ target: pages.slug });
  }
  console.log(`Seeded ${pageSlugs.length} empty page records.`);

  // --- Settings: shared multilingual fields and site configuration ---
  const settingKeys: { key: string; note: string }[] = [
    { key: "mission_statement", note: "[Mission statement — to be added in admin]" },
    { key: "vision_statement", note: "[Vision statement — to be added in admin]" },
    { key: "membership_form_url", note: "" },
    { key: "contact_email", note: "" },
    { key: "contact_phone", note: "" },
    { key: "contact_address", note: "" },
    { key: "social_facebook", note: "" },
    { key: "social_twitter", note: "" },
    { key: "social_instagram", note: "" },
    { key: "social_linkedin", note: "" },
  ];
  for (const { key } of settingKeys) {
    await db
      .insert(settings)
      .values({ key, valueEn: null, valueAm: null, valueOm: null })
      .onConflictDoNothing({ target: settings.key });
  }
  console.log(`Seeded ${settingKeys.length} settings keys (empty — fill in admin).`);

  // --- Leaders: 17 empty slots in governance order ---
  const leaderSlots: { roleTitleEn: string; order: number }[] = [
    { roleTitleEn: "President", order: 1 },
    { roleTitleEn: "Vice President", order: 2 },
    { roleTitleEn: "Vice President", order: 3 },
    { roleTitleEn: "Secretary", order: 4 },
    ...Array.from({ length: 13 }, (_, i) => ({
      roleTitleEn: "Department Head",
      order: 5 + i,
    })),
  ];
  const existingLeaders = await db.select({ id: leaders.id }).from(leaders);
  if (existingLeaders.length === 0) {
    for (const slot of leaderSlots) {
      await db.insert(leaders).values({
        fullName: "",
        roleTitleEn: slot.roleTitleEn,
        displayOrder: slot.order,
        status: "draft",
        guardianConsent: false,
      });
    }
    console.log(`Seeded ${leaderSlots.length} empty leader slots.`);
  } else {
    console.log("Leaders table already populated — skipping.");
  }

  // --- Partners: 2 named parent orgs + 13 placeholder slots ---
  const existingPartners = await db.select({ id: partners.id }).from(partners);
  if (existingPartners.length === 0) {
    await db.insert(partners).values([
      {
        name: "Organization for Social Development (OSD)",
        displayOrder: 1,
        isParentOrg: true,
        isPlaceholder: false,
        status: "published",
      },
      {
        name: "Save the Children",
        displayOrder: 2,
        isParentOrg: true,
        isPlaceholder: false,
        status: "published",
      },
    ]);
    for (let i = 0; i < 13; i++) {
      await db.insert(partners).values({
        name: null,
        displayOrder: 3 + i,
        isParentOrg: false,
        isPlaceholder: true,
        status: "draft",
      });
    }
    console.log("Seeded 2 parent-organization partners and 13 placeholder slots.");
  } else {
    console.log("Partners table already populated — skipping.");
  }

  await client.end();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// Utility kept for admin bootstrap scripts / future CLI use.
export function generateToken() {
  return randomBytes(24).toString("hex");
}
