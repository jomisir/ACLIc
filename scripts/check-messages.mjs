/**
 * Validates the next-intl message files. Run with `npm run check:messages`.
 *
 * Catches the three things that actually go wrong when translations are
 * edited by hand:
 *
 *  1. Key drift — a key added to en.json but not to am.json / om.json.
 *     next-intl falls back to English at runtime, so this fails silently
 *     in production and is easy to miss in review.
 *
 *  2. Untranslated strings — a value byte-identical to English, which
 *     usually means someone copied the file and never came back to it.
 *     Genuine cases (brand names) are listed in ALLOWED_IDENTICAL.
 *
 *  3. Broken ICU syntax. This matters more than usual here because Afaan
 *     Oromo uses apostrophes constantly (bu'aa, ta'e, wal-ga'ii), and in
 *     ICU MessageFormat an apostrophe is the escape character. A lone
 *     apostrophe before a letter is harmless, but one immediately before
 *     '#', '{' or '}' silently swallows the placeholder or throws. Rather
 *     than pattern-match for that, every message is compiled for real.
 */
import fs from "node:fs";
import path from "node:path";
import { IntlMessageFormat } from "intl-messageformat";

const LOCALES = ["en", "am", "om"];
const DIR = path.join(process.cwd(), "messages");

// Values legitimately identical across locales (proper nouns, brand names).
const ALLOWED_IDENTICAL = new Set(["Home.eyebrow"]);

function flatten(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? flatten(v, `${prefix}${k}.`)
      : [[`${prefix}${k}`, v]],
  );
}

const messages = Object.fromEntries(
  LOCALES.map((loc) => [
    loc,
    Object.fromEntries(flatten(JSON.parse(fs.readFileSync(path.join(DIR, `${loc}.json`), "utf8")))),
  ]),
);

const errors = [];
const enKeys = Object.keys(messages.en);

for (const loc of LOCALES) {
  const keys = Object.keys(messages[loc]);

  for (const k of enKeys) {
    if (!(k in messages[loc])) errors.push(`${loc}: missing key "${k}"`);
  }
  for (const k of keys) {
    if (!(k in messages.en)) errors.push(`${loc}: key "${k}" has no English counterpart`);
  }

  if (loc !== "en") {
    for (const k of enKeys) {
      if (
        k in messages[loc] &&
        messages[loc][k] === messages.en[k] &&
        !ALLOWED_IDENTICAL.has(k)
      ) {
        errors.push(`${loc}: "${k}" is identical to English — untranslated?`);
      }
    }
  }

  // Compile every message. This is the check that catches ICU apostrophe
  // problems, unbalanced braces and malformed plural forms.
  for (const [k, v] of Object.entries(messages[loc])) {
    if (typeof v !== "string") continue;
    try {
      new IntlMessageFormat(v, loc);
    } catch (e) {
      errors.push(`${loc}: "${k}" is not valid ICU MessageFormat — ${e.message}`);
    }
  }
}

// Placeholder parity: {query} present in English must exist in every locale.
for (const k of enKeys) {
  const names = (s) =>
    typeof s === "string"
      ? [...s.matchAll(/\{\s*(\w+)\s*(?:,|\})/g)].map((m) => m[1]).sort().join(",")
      : "";
  const expected = names(messages.en[k]);
  for (const loc of LOCALES.filter((l) => l !== "en")) {
    const actual = names(messages[loc][k]);
    if (expected !== actual) {
      errors.push(
        `${loc}: "${k}" placeholder mismatch — English has [${expected || "none"}], ${loc} has [${actual || "none"}]`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`Message check FAILED (${errors.length} problem(s)):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Message check passed: ${enKeys.length} keys × ${LOCALES.length} locales, all valid ICU.`);
