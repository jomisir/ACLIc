import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  uuid,
  date,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["superuser", "user"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);
export const workCategoryEnum = pgEnum("work_category", [
  "training",
  "campaign",
  "assembly",
  "advocacy",
  "partnership",
]);
export const visibilityEnum = pgEnum("visibility", ["public", "internal"]);
export const localeEnum = pgEnum("locale", ["en", "am", "om"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // create | update | publish | unpublish | delete | login | login_failed
  objectType: text("object_type").notNull(),
  objectId: text("object_id"),
  ip: text("ip"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  valueEn: text("value_en"),
  valueAm: text("value_am"),
  valueOm: text("value_om"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pages = pgTable("pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleEn: text("title_en"),
  titleAm: text("title_am"),
  titleOm: text("title_om"),
  bodyEn: text("body_en"),
  bodyAm: text("body_am"),
  bodyOm: text("body_om"),
  status: contentStatusEnum("status").notNull().default("draft"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leaders = pgTable("leaders", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  roleTitleEn: text("role_title_en"),
  roleTitleAm: text("role_title_am"),
  roleTitleOm: text("role_title_om"),
  bioEn: text("bio_en"),
  bioAm: text("bio_am"),
  bioOm: text("bio_om"),
  photoPath: text("photo_path"),
  displayOrder: integer("display_order").notNull().default(0),
  guardianConsent: boolean("guardian_consent").notNull().default(false),
  consentDate: date("consent_date"),
  status: contentStatusEnum("status").notNull().default("draft"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  logoPath: text("logo_path"),
  url: text("url"),
  displayOrder: integer("display_order").notNull().default(0),
  isParentOrg: boolean("is_parent_org").notNull().default(false),
  isPlaceholder: boolean("is_placeholder").notNull().default(true),
  status: contentStatusEnum("status").notNull().default("draft"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workItems = pgTable("work_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: workCategoryEnum("category").notNull(),
  titleEn: text("title_en"),
  titleAm: text("title_am"),
  titleOm: text("title_om"),
  summaryEn: text("summary_en"),
  summaryAm: text("summary_am"),
  summaryOm: text("summary_om"),
  occurredOn: date("occurred_on"),
  visibility: visibilityEnum("visibility").notNull().default("internal"),
  status: contentStatusEnum("status").notNull().default("draft"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  titleEn: text("title_en"),
  titleAm: text("title_am"),
  titleOm: text("title_om"),
  filePath: text("file_path"),
  fileSize: bigint("file_size", { mode: "number" }),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  visibility: visibilityEnum("visibility").notNull().default("internal"),
  status: contentStatusEnum("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  filePath: text("file_path").notNull(),
  altEn: text("alt_en"),
  altAm: text("alt_am"),
  altOm: text("alt_om"),
  width: integer("width"),
  height: integer("height"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscribers = pgTable("subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  language: localeEnum("language").notNull().default("en"),
  consentAt: timestamp("consent_at", { withTimezone: true }).notNull().defaultNow(),
  sourcePage: text("source_page"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  unsubscribeToken: text("unsubscribe_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * UNUSED. Login throttling is done entirely by `rate_limit_events` below,
 * under the scope "login" — see src/auth/index.ts and src/lib/rate-limit.ts.
 * Nothing reads or writes this table.
 *
 * It is kept only so the schema still matches the deployed database; dropping
 * it needs a migration. Do not start writing to it without deciding on a
 * retention policy first: unlike `rate_limit_events`, which stores an opaque
 * key, these columns hold an IP address next to an email address, which is
 * personal data with no expiry attached.
 */
export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  ip: text("ip").notNull(),
  email: text("email"),
  succeeded: boolean("succeeded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Generic Postgres-backed rate limiter — one row per attempt, counted over a
// rolling window. Backs both login throttling (scope "login") and the
// newsletter form (scope "newsletter_signup"). Sweeps its own expired rows.
export const rateLimitEvents = pgTable("rate_limit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  scope: text("scope").notNull(), // e.g. "newsletter_signup"
  key: text("key").notNull(), // e.g. the IP address
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Privacy-friendly analytics. Deliberately stores DAILY AGGREGATE COUNTS
 * only — one row per (day, path, locale) — so there is no per-visitor
 * record at all: no IP, no user agent, no cookie, no session, nothing that
 * could identify or re-identify a person. That matters more than usual
 * here, because a large share of this site's visitors are children.
 *
 * A consequence worth knowing: this cannot report unique visitors, only
 * page views. That is the intended trade.
 */
export const pageViews = pgTable(
  "page_views",
  {
    day: date("day").notNull(),
    path: text("path").notNull(), // locale-stripped, e.g. "/leaders"
    locale: localeEnum("locale").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.path, t.locale] })],
);

export const imageSlots = pgTable(
  "image_slots",
  {
    pageSlug: text("page_slug").notNull(),
    slotKey: text("slot_key").notNull(),
    mediaId: uuid("media_id").references(() => media.id, { onDelete: "set null" }),
    captionEn: text("caption_en"),
    captionAm: text("caption_am"),
    captionOm: text("caption_om"),
  },
  (t) => [primaryKey({ columns: [t.pageSlug, t.slotKey] })],
);
