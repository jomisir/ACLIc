import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAllSettings } from "@/lib/settings";
import { updateSetting } from "@/actions/settings";
import { LocaleTabs } from "@/components/admin/LocaleTabs";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const groups: { key: string; label: string; multilingual: boolean; hint?: string }[] = [
  { key: "mission_statement", label: "Mission statement", multilingual: true, hint: "Official wording only — leave empty until the coalition confirms it." },
  { key: "vision_statement", label: "Vision statement", multilingual: true, hint: "Official wording only — leave empty until the coalition confirms it." },
  { key: "membership_form_url", label: "Membership application form URL", multilingual: false, hint: "The external application the 'Apply for membership' button opens." },
  { key: "contact_email", label: "Contact email", multilingual: false },
  { key: "contact_phone", label: "Contact phone", multilingual: false },
  { key: "contact_address", label: "Contact address", multilingual: false },
  { key: "social_facebook", label: "Facebook URL", multilingual: false },
  { key: "social_twitter", label: "Twitter / X URL", multilingual: false },
  { key: "social_instagram", label: "Instagram URL", multilingual: false },
  { key: "social_linkedin", label: "LinkedIn URL", multilingual: false },
];

export default async function AdminSettingsPage() {
  const session = await auth();
  if (session?.user.role !== "superuser") redirect("/admin");

  const rows = await getAllSettings();
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  return (
    <div>
      <h1 className="text-2xl mb-6">Settings</h1>
      <div className="flex flex-col gap-8">
        {groups.map((g) => {
          const row = byKey[g.key];
          return (
            <div key={g.key}>
              <p className="text-sm font-medium mb-1">{g.label}</p>
              {g.hint && <p className="text-xs text-[#5a5e67] mb-2">{g.hint}</p>}
              <form action={updateSetting.bind(null, g.key)}>
                {g.multilingual ? (
                  <LocaleTabs
                    en={<RichTextEditor name="valueEn" defaultValue={row?.valueEn ?? ""} />}
                    am={<RichTextEditor name="valueAm" defaultValue={row?.valueAm ?? ""} lang="am" />}
                    om={<RichTextEditor name="valueOm" defaultValue={row?.valueOm ?? ""} />}
                  />
                ) : (
                  <input name="valueEn" defaultValue={row?.valueEn ?? ""} className="w-full max-w-md border border-[#c8a24a]/40 rounded px-3 py-2" />
                )}
                <button type="submit" className="mt-2 text-sm border border-[#c8a24a]/40 rounded px-3 py-1.5">
                  Save
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
