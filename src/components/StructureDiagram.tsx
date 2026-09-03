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

  // Both variants number the department nodes. Empty boxes read as a loading
  // skeleton rather than as a deliberate shape, and the home page is the first
  // thing a donor sees. Numbers work as plain enumeration even without a key
  // beside them: thirteen numbered boxes under a "Departments" label says
  // thirteen departments, which is the whole job of the compact variant. The
  // legend that resolves the numbers to names belongs to the full diagram.

  // --- Desktop (row) layout, viewBox 1000x410 ---
  //
  // INSET: every row is laid out in W - 60 and shifted right by 30. A box at
  // x=0 or ending at x=W has its 1px stroke centred on the viewBox edge, so
  // half of it is clipped and the outermost boxes render with a missing outer
  // border. The department row already did this; the senior row did not.
  const W = 1000;
  const INSET = 30;
  const inset = <T extends { x: number }>(n: T): T => ({ ...n, x: n.x + INSET });

  const assembly = { id: "assembly", x: 300, y: 10, w: 400, h: 56 };
  const president = { id: "president", x: 400, y: 120, w: 200, h: 56 };
  const seniorRow = rowLayout(3, W - INSET * 2, 200, 56, 230, "senior").map(inset);
  const deptRow = rowLayout(13, W - INSET * 2, 66, 44, 340, "dept").map(inset);

  // The department bus.
  //
  // Previously each department connector started at (500, 286) — the bottom
  // centre of the MIDDLE senior box, i.e. the second Vice President. Drawn that
  // way the chart states that all thirteen department heads report to VP #2,
  // which contradicts this page's own copy: "One President, two Vice
  // Presidents, and a Secretary, ABOVE thirteen department heads". Anyone who
  // reads org charts professionally — which is exactly this page's audience —
  // reads the line the way it is drawn.
  //
  // So the three senior boxes drop onto a shared horizontal bus, and the
  // departments hang off that bus. The claim becomes "departments sit under
  // senior leadership collectively", which is what the prose says.
  const SENIOR_BOTTOM = 230 + 56;
  const DEPT_TOP = 340;
  const BUS_Y = (SENIOR_BOTTOM + DEPT_TOP) / 2;
  const busStart = deptRow[0].x + deptRow[0].w / 2;
  const busEnd = deptRow[deptRow.length - 1].x + deptRow[deptRow.length - 1].w / 2;

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
          {/* senior row down onto the shared bus */}
          {seniorRow.map((n) => (
            <path
              key={`b-${n.id}`}
              d={`M ${n.x + n.w / 2} ${SENIOR_BOTTOM} L ${n.x + n.w / 2} ${BUS_Y}`}
              stroke="var(--gold)"
              fill="none"
              strokeWidth={1}
              className="diagram-line"
            />
          ))}
          <path
            d={`M ${busStart} ${BUS_Y} L ${busEnd} ${BUS_Y}`}
            stroke="var(--gold)"
            fill="none"
            strokeWidth={1}
            className="diagram-line"
          />
          {/* bus down into each department */}
          {deptRow.map((n) => (
            <path
              key={`s-${n.id}`}
              d={`M ${n.x + n.w / 2} ${BUS_Y} L ${n.x + n.w / 2} ${n.y}`}
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
              label={String(i + 1)}
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
      {isFull ? (
        <DepartmentLegend labels={deptLabels} heading={t("departmentsHeading")} />
      ) : (
        <p className="eyebrow mt-3 text-center">{t("departmentsHeading")}</p>
      )}
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
            <span className="text-sm text-muted tabular-nums w-5 shrink-0 text-right">{i + 1}</span>
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
  // gridLayout starts at x=0, which puts the left column's stroke on the
  // viewBox edge and leaves the whole grid visually off-centre. Centre it.
  const GRID_W = 3 * 92 + 2 * 8;
  const GRID_X = (W - GRID_W) / 2;
  const centre = <T extends { x: number }>(n: T): T => ({ ...n, x: n.x + GRID_X });

  const assembly = { x: 20, y: 10, w: 280, h: 50 };
  const president = { x: 60, y: 90, w: 200, h: 50 };
  const seniorRow = gridLayout(3, 3, 92, 50, 8, 8, 170, "m-senior").map(centre);
  const deptGrid = gridLayout(13, 3, 92, 44, 8, 10, 250, "m-dept").map(centre);
  const totalH = 250 + Math.ceil(13 / 3) * 54 + 20;

  // Same correction as the desktop row: the departments hang off senior
  // leadership as a whole, not off one Vice President.
  //
  // On mobile the departments are a five-row grid, so thirteen separate
  // connectors would cross back through the rows above. A single rail does both
  // jobs at once — the three senior boxes drop onto it, and it spans the full
  // width of the grid, so it caps all thirteen rather than pointing at any one
  // of them. One horizontal line, no ambiguity about which box it lands on.
  const SENIOR_BOTTOM = 170 + 50;
  const RAIL_Y = 238;

  return (
    <svg viewBox={`0 0 ${W} ${totalH}`} className="md:hidden w-full h-auto diagram-draw">
      <path d={elbow(160, 60, 160, 90)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      {seniorRow.map((n) => (
        <path key={`mp-${n.id}`} d={elbow(160, 140, n.x + n.w / 2, n.y)} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      ))}
      {seniorRow.map((n) => (
        <path key={`mb-${n.id}`} d={`M ${n.x + n.w / 2} ${SENIOR_BOTTOM} L ${n.x + n.w / 2} ${RAIL_Y}`} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />
      ))}
      <path d={`M ${GRID_X} ${RAIL_Y} L ${GRID_X + GRID_W} ${RAIL_Y}`} stroke="var(--gold)" fill="none" strokeWidth={1} className="diagram-line" />

      <NodeBox n={assembly} label={labels.assembly} interactive={isFull} onFocusDetail={detailFor.assembly} />
      <NodeBox n={president} label={labels.president} interactive={isFull} onFocusDetail={detailFor.president} />
      {seniorRow.map((n, i) => (
        <NodeBox key={n.id} n={n} label={labels.senior[i]} interactive={isFull} onFocusDetail={detailFor.vp} />
      ))}
      {deptGrid.map((n, i) => (
        <NodeBox
          key={n.id}
          n={n}
          label={String(i + 1)}
          accessibleName={`${i + 1}. ${labels.dept[i]}`}
          fontSize="15px"
          interactive={isFull}
          onFocusDetail={detailFor.dept}
        />
      ))}
    </svg>
  );
}
