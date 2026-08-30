import { getViewsSummary, getSubscriberGrowth } from "@/lib/analytics";
import { ViewsChart, RankedBars } from "@/components/admin/ViewsChart";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  am: "አማርኛ (Amharic)",
  om: "Afaan Oromoo",
};

export default async function AnalyticsPage() {
  // Deliberately available to both roles: this contains no personal data at
  // all, so there is nothing here an editor should be walled off from.
  const [views, growth] = await Promise.all([getViewsSummary(30), getSubscriberGrowth(30)]);

  const newSignups = growth.reduce((s, r) => s + r.total, 0);
  const newConfirmed = growth.reduce((s, r) => s + r.confirmed, 0);

  return (
    <div>
      <h1 className="text-2xl mb-1">Analytics</h1>
      <p className="text-sm text-[#5a5e67] mb-8">Last 30 days.</p>

      {/* Hero numbers: these are single values, so they are stat tiles, not
          charts. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Stat label="Page views" value={views.totalViews} />
        <Stat label="New newsletter signups" value={newSignups} />
        <Stat label="…of which confirmed" value={newConfirmed} />
      </div>

      <section className="mb-10">
        <h2 className="text-lg mb-3">Page views per day</h2>
        <ViewsChart daily={views.daily} />
      </section>

      <section className="mb-10">
        <h2 className="text-lg mb-3">Most viewed pages</h2>
        <RankedBars
          rows={views.byPath.map((r) => ({ label: r.path, count: r.count }))}
          emptyLabel="No page views recorded yet."
        />
      </section>

      <section className="mb-10">
        <h2 className="text-lg mb-3">Views by language</h2>
        <RankedBars
          rows={views.byLocale.map((r) => ({
            label: LOCALE_LABELS[r.locale] ?? r.locale,
            count: r.count,
          }))}
          emptyLabel="No page views recorded yet."
        />
      </section>

      {/* Table view of the same numbers — required relief for the contrast
          WARN on the chart's fill, and generally the fastest way to read
          exact figures. */}
      <section className="mb-10">
        <h2 className="text-lg mb-3">All figures</h2>
        <div className="overflow-x-auto border border-[#c8a24a]/30 rounded">
          <table className="w-full text-sm">
            <caption className="sr-only">Page views by day for the last 30 days</caption>
            <thead className="bg-[#c8a24a]/10 text-left">
              <tr>
                <th scope="col" className="px-3 py-2">Day</th>
                <th scope="col" className="px-3 py-2 text-right">Page views</th>
              </tr>
            </thead>
            <tbody>
              {views.daily.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-4 text-[#5a5e67]">
                    Nothing recorded yet.
                  </td>
                </tr>
              ) : (
                views.daily.map((d) => (
                  <tr key={d.day} className="border-t border-[#c8a24a]/20">
                    <td className="px-3 py-2">{d.day}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{d.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-[#5a5e67] max-w-prose">
        These counts are daily totals only. No IP address, cookie, device or
        session is recorded, so this data cannot identify a visitor — which
        matters on a site whose visitors include children. The trade-off is
        that unique visitors cannot be reported, only page views. Search terms
        are not logged at all.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[#c8a24a]/30 rounded p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[#5a5e67] mb-1">{label}</p>
      <p className="font-display text-3xl tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
