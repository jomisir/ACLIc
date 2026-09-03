import { getTranslations } from "next-intl/server";
import { asc, gte } from "drizzle-orm";
import { db } from "@/db";
import { leaders } from "@/db/schema";
import type { Locale } from "@/i18n/routing";

const roleCol = { en: "roleTitleEn", am: "roleTitleAm", om: "roleTitleOm" } as const;

/**
 * The 13 department nodes take their labels from the role titles of leader
 * slots 5-17, which is where the seed puts the department heads. Naming a
 * department is therefore just renaming that slot's role in the admin panel —
 * no separate field, and it works in all three languages already.
 *
 * Publication status and guardian consent are deliberately NOT filtered on
 * here. A role title is the name of a position, not information about the
 * child holding it: the structure is public whether or not anyone is assigned,
 * and an unfilled or unpublished slot still has a department to show. No
 * personal data from the leaders table reaches this component.
 *
 * Slots still carrying the seeded "Department Head" placeholder fall back to
 * the translated generic label, so the diagram reads correctly in Amharic and
 * Afaan Oromoo before anyone has renamed anything.
 *
 * Layout note: the desktop row gives each of the 13 nodes 66x44px at 9px type,
 * so a name much longer than "Child Protection" will wrap past the box and be
 * clipped by the foreignObject. The full name always reaches assistive tech and
 * hover through the node's <title> and aria-label, but if the real department
 * names turn out long, the row needs rethinking — numbered nodes with a legend
 * beneath the diagram is the obvious alternative. Worth checking once ACLIC
 * supplies the actual names, in Amharic especially.
 */
async function departmentLabels(locale: Locale, fallback: string): Promise<string[]> {
  const rows = await db
    .select({
      roleTitleEn: leaders.roleTitleEn,
      roleTitleAm: leaders.roleTitleAm,
      roleTitleOm: leaders.roleTitleOm,
    })
    .from(leaders)
    .where(gte(leaders.displayOrder, 5))
    .orderBy(asc(leaders.displayOrder))
    .limit(13);

  return Array.from({ length: 13 }, (_, i) => {
    const row = rows[i];
    const named = row?.[roleCol[locale]] ?? row?.roleTitleEn ?? null;
    // "Department Head" is the seeded placeholder, not a department name.
    return !named || named === "Department Head" ? fallback : named;
  });
}

function rowLayout(count: number, containerW: number, boxW: number, boxH: number, y: number, startId: string) {
  const gap = count > 1 ? (containerW - count * boxW) / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => ({
    id: `${startId}-${i}`,
    x: i * (boxW + gap),
    y,
    w: boxW,
    h: boxH,
  }));
}

function gridLayout(count: number, cols: number, boxW: number, boxH: number, gapX: number, gapY: number, startY: number, startId: string) {
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return {
      id: `${startId}-${i}`,
      x: col * (boxW + gapX),
      y: startY + row * (boxH + gapY),
      w: boxW,
      h: boxH,
    };
  });
}

function elbow(x1: number, y1: number, x2: number, y2: number) {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}

function NodeBox({
  n,
  label,
  interactive,
  onFocusDetail,
}: {
  n: { x: number; y: number; w: number; h: number };
  label: string;
  interactive: boolean;
  onFocusDetail?: string;
}) {
  const content = (
    <>
      <rect
        x={n.x}
        y={n.y}
        width={n.w}
        height={n.h}
        rx={4}
        fill="var(--surface-raised)"
        stroke="var(--gold)"
        strokeWidth={1}
        className="diagram-node"
      />
      <foreignObject x={n.x} y={n.y} width={n.w} height={n.h}>
        <div
          className="w-full h-full flex items-center justify-center text-center px-1 leading-tight"
          style={{ fontSize: n.h > 45 ? "11px" : "9px", color: "var(--ink)" }}
        >
          {label}
        </div>
      </foreignObject>
    </>
  );

  if (!interactive) return content;

  return (
    <g role="button" tabIndex={0} aria-label={`${label}. ${onFocusDetail ?? ""}`} className="diagram-node-interactive">
      <title>{`${label}${onFocusDetail ? ` — ${onFocusDetail}` : ""}`}</title>
      {content}
    </g>
  );
}

export async function StructureDiagram({
  variant,
  locale,
}: {
  variant: "compact" | "full";
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Structure" });
  const tLeaders = await getTranslations({ locale, namespace: "Leaders" });

  const detailFor = {
    assembly: t("ageNote"),
    president: tLeaders("president"),
    vp: tLeaders("vicePresident"),
    secretary: tLeaders("secretary"),
    dept: tLeaders("departmentHead"),
  };

  const isFull = variant === "full";
  const deptLabels = await departmentLabels(locale, tLeaders("departmentHead"));

  // --- Desktop (row) layout, viewBox 1000x520 ---
  const W = 1000;
  const assembly = { id: "assembly", x: 300, y: 10, w: 400, h: 56 };
  const president = { id: "president", x: 400, y: 120, w: 200, h: 56 };
  const seniorRow = rowLayout(3, W, 200, 56, 230, "senior");
  const deptRow = rowLayout(13, W - 60, 66, 44, 340, "dept").map((n) => ({ ...n, x: n.x + 30 }));

  const seniorLabels = [tLeaders("vicePresident"), tLeaders("vicePresident"), tLeaders("secretary")];

  return (
    <figure>
      <div className="relative w-full">
        {/* Desktop / tablet: horizontal row layout */}
        <svg
          viewBox={`0 0 ${W} 410`}
          className="hidden md:block w-full h-auto diagram-draw"
          role={isFull ? undefined : "img"}
          aria-label={isFull ? undefined : t("diagramCaption")}
        >
          <path d={elbow(500, 66, 500, 120)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
          {seniorRow.map((n) => (
            <path
              key={`p-${n.id}`}
              d={elbow(500, 176, n.x + n.w / 2, n.y)}
              stroke="var(--gold)"
              fill="none"
              strokeWidth={1}
              className="diagram-line"
            />
          ))}
          {deptRow.map((n) => (
            <path
              key={`s-${n.id}`}
              d={elbow(500, 286, n.x + n.w / 2, n.y)}
              stroke="var(--gold)"
              fill="none"
              strokeWidth={1}
              className="diagram-line"
            />
          ))}

          <NodeBox n={assembly} label={t("assemblyHeading")} interactive={isFull} onFocusDetail={detailFor.assembly} />
          <NodeBox n={president} label={tLeaders("president")} interactive={isFull} onFocusDetail={detailFor.president} />
          {seniorRow.map((n, i) => (
            <NodeBox key={n.id} n={n} label={seniorLabels[i]} interactive={isFull} onFocusDetail={detailFor.vp} />
          ))}
          {deptRow.map((n, i) => (
            <NodeBox key={n.id} n={n} label={deptLabels[i]} interactive={isFull} onFocusDetail={detailFor.dept} />
          ))}
        </svg>

        {/* Mobile: vertical stack layout */}
        <MobileDiagram
          isFull={isFull}
          labels={{
            assembly: t("assemblyHeading"),
            president: tLeaders("president"),
            senior: seniorLabels,
            dept: deptLabels,
          }}
          detailFor={detailFor}
        />
      </div>
      {isFull && <figcaption className="eyebrow mt-4">{t("diagramCaption")}</figcaption>}
    </figure>
  );
}

function MobileDiagram({
  isFull,
  labels,
  detailFor,
}: {
  isFull: boolean;
  labels: { assembly: string; president: string; senior: string[]; dept: string[] };
  detailFor: Record<string, string>;
}) {
  const W = 320;
  const assembly = { x: 20, y: 10, w: 280, h: 50 };
  const president = { x: 60, y: 90, w: 200, h: 50 };
  const seniorRow = gridLayout(3, 3, 92, 50, 8, 8, 170, "m-senior");
  const deptGrid = gridLayout(13, 3, 92, 44, 8, 10, 250, "m-dept");
  const totalH = 250 + Math.ceil(13 / 3) * 54 + 20;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="md:hidden w-full h-auto diagram-draw">
      <path d={elbow(160, 60, 160, 90)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      {seniorRow.map((n) => (
        <path key={`mp-${n.id}`} d={elbow(160, 140, n.x + n.w / 2, n.y)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      ))}
      {deptGrid.map((n) => (
        <path key={`ms-${n.id}`} d={elbow(160, 220, n.x + n.w / 2, n.y)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      ))}

      <NodeBox n={assembly} label={labels.assembly} interactive={isFull} onFocusDetail={detailFor.assembly} />
      <NodeBox n={president} label={labels.president} interactive={isFull} onFocusDetail={detailFor.president} />
      {seniorRow.map((n, i) => (
        <NodeBox key={n.id} n={n} label={labels.senior[i]} interactive={isFull} onFocusDetail={detailFor.vp} />
      ))}
      {deptGrid.map((n, i) => (
        <NodeBox key={n.id} n={n} label={labels.dept[i]} interactive={isFull} onFocusDetail={detailFor.dept} />
      ))}
    </svg>
  );
}
