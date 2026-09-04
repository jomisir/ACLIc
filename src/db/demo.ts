/**
 * Fills a LOCAL database with obviously-fake content so the site can be
 * demonstrated. `npm run db:demo`.
 *
 * Why this is separate from `db:seed`: seed creates the real, empty structure —
 * the superuser, the eleven page records, seventeen leadership slots, thirteen
 * partner slots — and deliberately writes no content, because none of ACLIC's
 * wording has been confirmed. This script is the opposite: throwaway text whose
 * only job is to make the pages render with something in them.
 *
 * Every string it writes starts with "SAMPLE" and the leadership placeholders
 * are called "Sample Leader One", "Sample Leader Two" and so on. That is
 * deliberate on two counts: nothing here can ever be mistaken for approved
 * ACLIC wording, and no invented name, biography or photograph of a child is
 * created even as test data.
 *
 * Refuses to run against anything but a local database — see assertLocal().
 */
// Next.js reads .env.local in preference to .env; plain dotenv reads only .env.
// Load both, .env.local winning, so `npm run db:*` and the dev server always
// agree about which database they are pointed at.
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"] });
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const { pages, leaders, partners, settings, workItems, resources } = schema;

/**
 * A demo run publishes leader profiles with the consent flag set, and writes
 * placeholder text over mission and vision. Both would be damaging on a real
 * database, so refuse anything that is not plainly a local host.
 */
function assertLocal(connectionString: string) {
  const host = new URL(connectionString).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local) {
    throw new Error(
      `Refusing to write demo content to "${host}". This script is for a local ` +
        `database only — it publishes profiles with consent pre-set and overwrites ` +
        `mission and vision with placeholder text.`,
    );
  }
}

const tri = (en: string, am: string, om: string) => ({ en, am, om });

const DEPARTMENTS = [
  tri("SAMPLE Child Protection", "SAMPLE የሕፃናት ጥበቃ", "SAMPLE Eegumsa Daaimmanii"),
  tri("SAMPLE Education", "SAMPLE ትምህርት", "SAMPLE Barnoota"),
  tri("SAMPLE Health and Nutrition", "SAMPLE ጤናና ስነ ምግብ", "SAMPLE Fayyaa fi Nyaata"),
  tri("SAMPLE Gender Equality", "SAMPLE የፆታ እኩልነት", "SAMPLE Walqixxummaa Saalaa"),
  tri("SAMPLE Climate and Environment", "SAMPLE የአየር ንብረትና አካባቢ", "SAMPLE Qilleensaa fi Naannoo"),
  tri("SAMPLE Communications", "SAMPLE ኮሙኒኬሽን", "SAMPLE Qunnamtii"),
  tri("SAMPLE Membership", "SAMPLE አባልነት", "SAMPLE Miseensummaa"),
  tri("SAMPLE Research", "SAMPLE ጥናትና ምርምር", "SAMPLE Qorannoo"),
  tri("SAMPLE Partnerships", "SAMPLE አጋርነት", "SAMPLE Michooma"),
  tri("SAMPLE Finance", "SAMPLE ፋይናንስ", "SAMPLE Faayinaansii"),
  tri("SAMPLE Training", "SAMPLE ስልጠና", "SAMPLE Leenjii"),
  tri("SAMPLE Advocacy", "SAMPLE ተሟጋችነት", "SAMPLE Falmii"),
  tri("SAMPLE Culture and Sport", "SAMPLE ባህልና ስፖርት", "SAMPLE Aadaa fi Ispoortii"),
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  assertLocal(connectionString);

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  // --- Settings: mission, vision, contact, membership link ---
  const settingValues: Record<string, { en: string; am: string; om: string }> = {
    mission_statement: tri(
      "<p>SAMPLE — placeholder mission text for demonstration only. Replace from Admin → Settings once ACLIC's official wording is confirmed.</p>",
      "<p>SAMPLE — ለማሳያ ብቻ የተቀመጠ ጊዜያዊ ጽሑፍ።</p>",
      "<p>SAMPLE — agarsiisaaf qofa kan taʼe barreeffama yeroo.</p>",
    ),
    vision_statement: tri(
      "<p>SAMPLE — placeholder vision text for demonstration only.</p>",
      "<p>SAMPLE — ለማሳያ ብቻ የተቀመጠ ጊዜያዊ ጽሑፍ።</p>",
      "<p>SAMPLE — agarsiisaaf qofa kan taʼe barreeffama yeroo.</p>",
    ),
    membership_form_url: tri("https://example.org/sample-form", "https://example.org/sample-form", "https://example.org/sample-form"),
    contact_email: tri("sample@example.org", "sample@example.org", "sample@example.org"),
    contact_phone: tri("+251 00 000 0000", "+251 00 000 0000", "+251 00 000 0000"),
    contact_address: tri("SAMPLE address, Addis Ababa", "SAMPLE አድራሻ፣ አዲስ አበባ", "SAMPLE teessoo, Finfinnee"),
  };

  for (const [key, v] of Object.entries(settingValues)) {
    await db
      .update(settings)
      .set({ valueEn: v.en, valueAm: v.am, valueOm: v.om, updatedAt: new Date() })
      .where(eq(settings.key, key));
  }

  // --- Pages: a short body each, published ---
  const pageRows = await db.select().from(pages);
  for (const page of pageRows) {
    await db
      .update(pages)
      .set({
        titleEn: `SAMPLE ${page.slug}`,
        titleAm: `SAMPLE ${page.slug}`,
        titleOm: `SAMPLE ${page.slug}`,
        bodyEn: `<p>SAMPLE body text for <strong>/${page.slug}</strong>, for demonstration only.</p>`,
        bodyAm: `<p>SAMPLE — ለ <strong>/${page.slug}</strong> ማሳያ ጽሑፍ።</p>`,
        bodyOm: `<p>SAMPLE — <strong>/${page.slug}</strong> agarsiisaaf.</p>`,
        status: "published",
      })
      .where(eq(pages.slug, page.slug));
  }

  // --- Leaders: name the departments, publish a few with consent recorded ---
  const leaderRows = await db.select().from(leaders).orderBy(leaders.displayOrder);
  for (const [i, leader] of leaderRows.entries()) {
    const dept = leader.displayOrder >= 5 ? DEPARTMENTS[leader.displayOrder - 5] : null;
    await db
      .update(leaders)
      .set({
        fullName: `Sample Leader ${i + 1}`,
        ...(dept ? { roleTitleEn: dept.en, roleTitleAm: dept.am, roleTitleOm: dept.om } : {}),
        bioEn: "<p>SAMPLE placeholder biography. No real biography of any child is stored by this script.</p>",
        bioAm: "<p>SAMPLE — ጊዜያዊ የሕይወት ታሪክ ጽሑፍ።</p>",
        bioOm: "<p>SAMPLE — seenaa jireenyaa yeroo.</p>",
        // Consent is pre-set ONLY because this is throwaway data about nobody.
        // On a real profile it is recorded by a superuser, per child, from a
        // signed guardian consent form.
        guardianConsent: true,
        consentDate: new Date().toISOString().slice(0, 10),
        status: "published",
      })
      .where(eq(leaders.id, leader.id));
  }

  // --- Partners: fill the placeholder slots ---
  const partnerRows = await db.select().from(partners).orderBy(partners.displayOrder);
  for (const [i, partner] of partnerRows.entries()) {
    await db
      .update(partners)
      .set({
        name: partner.isParentOrg ? partner.name : `SAMPLE Partner ${i + 1}`,
        isPlaceholder: false,
        status: "published",
      })
      .where(eq(partners.id, partner.id));
  }

  // --- Work items across every category, and a couple of resources ---
  await db.delete(workItems);
  const categories = ["training", "campaign", "assembly", "advocacy", "partnership"] as const;
  for (const [i, category] of categories.entries()) {
    await db.insert(workItems).values({
      category,
      titleEn: `SAMPLE ${category} item`,
      titleAm: `SAMPLE ${category} ንጥል`,
      titleOm: `SAMPLE ${category} waan`,
      summaryEn: `<p>SAMPLE summary for a ${category} entry, for demonstration only.</p>`,
      summaryAm: "<p>SAMPLE — ማጠቃለያ ጽሑፍ።</p>",
      summaryOm: "<p>SAMPLE — cuunfaa barreeffamaa.</p>",
      occurredOn: `2026-0${i + 1}-15`,
      visibility: "public",
      status: "published",
    });
  }

  await db.delete(resources);
  await db.insert(resources).values([
    {
      titleEn: "SAMPLE annual report",
      titleAm: "SAMPLE ዓመታዊ ሪፖርት",
      titleOm: "SAMPLE gabaasa waggaa",
      filePath: null,
      fileSize: 248000,
      visibility: "public",
      status: "published",
    },
    {
      titleEn: "SAMPLE internal note (not public)",
      titleAm: "SAMPLE ውስጣዊ ማስታወሻ",
      titleOm: "SAMPLE yaadannoo keessoo",
      filePath: null,
      fileSize: 12000,
      visibility: "internal",
      status: "published",
    },
  ]);

  console.log("Demo content written. Every string is prefixed SAMPLE.");
  console.log("Undo with: npm run db:seed  (after dropping and re-migrating the database)");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
