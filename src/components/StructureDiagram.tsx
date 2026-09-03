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
 * These names are NOT drawn inside the nodes. Thirteen boxes across the row
 * leaves each one 66px wide, which forced 9px type — too small to read on its
 * own terms, and worse in Ethiopic, where the characters carry more internal
 * detail than Latin ones and degrade faster as they shrink. This diagram is the
 * piece that carries the argument to a ministry official; it cannot be the part
 * of the page nobody can read.
 *
 * So the nodes are numbered and the names live in a legend beneath, at a normal
 * reading size. Department names of any length stop being a layout constraint,
 * both scripts stay legible, and a numbered chart with a key is if anything the
 * more formal convention for an org chart. Each node still announces its full
 * name to assistive tech and on hover, so the numbering is purely visual.
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
  accessibleName,
  fontSize,
}: {
  n: { x: number; y: number; w: number; h: number };
  label: string;
  interactive: boolean;
  onFocusDetail?: string;
  /**
   * What assistive tech and the hover tooltip announce, when that differs from
   * what is drawn. A department node draws its number and announces its name.
   */
  accessibleName?: string;
  fontSize?: string;
}) {
  const name = accessibleName ?? label;
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
          style={{ fontSize: fontSize ?? (n.h > 45 ? "11px" : "9px"), color: "var(--ink)" }}
        >
          {label}
        </div>
      </foreignObject>
    </>
  );

  if (!interactive) return content;

  return (
    <g role="button" tabIndex={0} aria-label={`${name}. ${onFocusDetail ?? ""}`} className="diagram-node-interactive">
      <title>{`${name}${onFocusDetail ? ` — ${onFocusDetail}` : ""}`}</title>
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

  // The compact variant on the home page is a teaser with no legend under it,
  // so numbering there would be a key with nothing to unlock. It draws the
  // department row as plain boxes — the shape of the organisation — and the
  // svg's own aria-label carries the description. The full diagram on
  // /structure is where the numbers and the legend belong.
  const deptNodeLabel = (i: number) => (isFull ? String(i + 1) : "");

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
            <NodeBox
              key={n.id}
              n={n}
              label={deptNodeLabel(i)}
              accessibleName={`${i + 1}. ${deptLabels[i]}`}
              fontSize="15px"
              interactive={isFull}
              onFocusDetail={detailFor.dept}
            />
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
      {isFull && <DepartmentLegend labels={deptLabels} heading={t("departmentsHeading")} />}
      {isFull && <figcaption className="eyebrow mt-4">{t("diagramCaption")}</figcaption>}
    </figure>
  );
}

/**
 * The key to the numbered department nodes.
 *
 * Plain HTML rather than SVG text, so the names reflow, scale with the user's
 * font size, stay selectable, and wrap properly in Amharic. The heading uses
 * Structure.departmentsHeading, which already exists in all three locales.
 *
 * `aria-hidden` because every node already announces its own full name — a
 * screen reader reading the chart and then the identical list again would just
 * be repetition. Sighted readers are the ones who need the mapping.
 */
function DepartmentLegend({ labels, heading }: { labels: string[]; heading: string }) {
  return (
    <div className="mt-6" aria-hidden="true">
      <p className="eyebrow mb-3">{heading}</p>
      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
        {labels.map((label, i) => (
          <li key={i} className="flex gap-2 items-baseline">
            <span className="text-2xs text-muted tabular-nums w-5 shrink-0 text-right">{i + 1}</span>
            <span className="measure">{label}</span>
          </li>
        ))}
      </ol>
    </div>
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
        <NodeBox
          key={n.id}
          n={n}
          label={isFull ? String(i + 1) : ""}
          accessibleName={`${i + 1}. ${labels.dept[i]}`}
          fontSize="15px"
          interactive={isFull}
          onFocusDetail={detailFor.dept}
        />
      ))}
    </svg>
  );
}
