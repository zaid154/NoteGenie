// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (MindMap). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useMemo, useRef, useState } from "react";
import { parseNoteSections } from "../utils/parseNoteSections.js";
import { IconPlus, IconX } from "./icons.jsx";

// Pull a handful of short "leaf" labels out of a section body (top-level bullets,
// preferring the bolded term). No AI call — derived from the existing notes markdown.
function extractLeaves(body = "", limit = 5) {
  const leaves = [];
  for (const line of String(body).split("\n")) {
    const m = line.match(/^\s{0,2}[-*+]\s+(.+)/);
    if (!m) continue;
    const bold = m[1].match(/\*\*(.+?)\*\*/);
    let label = (bold ? bold[1] : m[1])
      .replace(/[*`_#>]/g, "")
      .replace(/\[(.+?)\]\(.*?\)/g, "$1")
      .trim();
    if (label.length > 46) label = `${label.slice(0, 44)}…`;
    if (label) leaves.push(label);
    if (leaves.length >= limit) break;
  }
  return leaves;
}

function buildTree(title, sections) {
  return {
    title: title || "Notes",
    branches: sections.slice(0, 12).map((s) => ({
      title: s.title,
      slug: s.slug,
      leaves: extractLeaves(s.body),
    })),
  };
}

// Radial layout → node list with x/y coords + connector list.
function layout(tree, collapsed) {
  const nodes = [{ id: "root", kind: "root", label: tree.title, x: 0, y: 0 }];
  const links = [];
  const n = tree.branches.length || 1;
  const R1 = Math.max(190, 60 + n * 18);

  tree.branches.forEach((b, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const bx = Math.cos(angle) * R1;
    const by = Math.sin(angle) * R1;
    const bid = `b-${i}`;
    nodes.push({ id: bid, kind: "branch", label: b.title, slug: b.slug, x: bx, y: by, count: b.leaves.length });
    links.push({ from: "root", to: bid, x1: 0, y1: 0, x2: bx, y2: by });

    if (collapsed.has(b.slug)) return;
    const m = b.leaves.length;
    const spread = Math.min(Math.PI * 0.7, 0.35 * m + 0.2);
    const R2 = 140;
    b.leaves.forEach((leaf, j) => {
      const la = angle + (m > 1 ? (j - (m - 1) / 2) * (spread / (m - 1 || 1)) : 0);
      const lx = bx + Math.cos(la) * R2;
      const ly = by + Math.sin(la) * R2;
      const lid = `l-${i}-${j}`;
      nodes.push({ id: lid, kind: "leaf", label: leaf, x: lx, y: ly });
      links.push({ from: bid, to: lid, x1: bx, y1: by, x2: lx, y2: ly });
    });
  });

  return { nodes, links };
}

const NODE = {
  root: { w: 176, h: 52 },
  branch: { w: 168, h: 46 },
  leaf: { w: 150, h: 38 },
};

const VIEW_W = 960;
const VIEW_H = 660;

export default function MindMap({ title, notes }) {
  const sections = useMemo(() => parseNoteSections(notes || ""), [notes]);
  const tree = useMemo(() => buildTree(title, sections), [title, sections]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.72 });
  const drag = useRef(null);

  const { nodes, links } = useMemo(() => layout(tree, collapsed), [tree, collapsed]);

  if (!sections.length) {
    return (
      <div className="grid place-items-center py-16 text-center text-sm text-muted">
        Generate notes with section headings to see a mind map.
      </div>
    );
  }

  function toggleBranch(slug) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.4, v.scale * factor)) }));
  }
  function onPointerDown(e) {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    // Convert screen-pixel drag delta into viewBox user units so panning tracks the cursor.
    const rect = e.currentTarget.getBoundingClientRect();
    const k = rect.width ? VIEW_W / rect.width : 1;
    setView((v) => ({
      ...v,
      x: drag.current.ox + (e.clientX - drag.current.sx) * k,
      y: drag.current.oy + (e.clientY - drag.current.sy) * k,
    }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  const zoom = (factor) =>
    setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.4, v.scale * factor)) }));
  const reset = () => setView({ x: 0, y: 0, scale: 0.72 });

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-xl border border-line bg-canvas/40">
      <div className="absolute right-3 top-3 z-10 flex gap-1.5">
        <button type="button" onClick={() => zoom(1.15)} className="btn-outline px-2 py-1 text-sm" aria-label="Zoom in">
          <IconPlus width={15} height={15} />
        </button>
        <button type="button" onClick={() => zoom(0.87)} className="btn-outline px-2 py-1 text-sm" aria-label="Zoom out">
          <span className="block h-[15px] w-[15px] text-center leading-[15px]">−</span>
        </button>
        <button type="button" onClick={reset} className="btn-outline px-2.5 py-1 text-xs" aria-label="Reset view">
          Reset
        </button>
      </div>
      <svg
        className="h-full w-full touch-none select-none"
        viewBox={`${-VIEW_W / 2} ${-VIEW_H / 2} ${VIEW_W} ${VIEW_H}`}
        style={{ cursor: drag.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        role="img"
        aria-label={`Mind map of ${tree.title} with ${tree.branches.length} sections`}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          <g>
            {links.map((l) => (
              <path
                key={`${l.from}-${l.to}`}
                d={`M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`}
                className="stroke-slate-300 dark:stroke-slate-700"
                fill="none"
                strokeWidth={1.5}
              />
            ))}
            {nodes.map((node) => {
              const dim = NODE[node.kind];
              return (
                <foreignObject
                  key={node.id}
                  x={node.x - dim.w / 2}
                  y={node.y - dim.h / 2}
                  width={dim.w}
                  height={dim.h}
                  style={{ overflow: "visible" }}
                >
                  {node.kind === "branch" ? (
                    <button
                      type="button"
                      onClick={() => toggleBranch(node.slug)}
                      title={collapsed.has(node.slug) ? "Expand" : "Collapse"}
                      className="flex h-full w-full items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2 text-center text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-400 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300"
                    >
                      <span className="line-clamp-2">{node.label}</span>
                      {node.count > 0 && (
                        <span className="shrink-0 opacity-60">
                          {collapsed.has(node.slug) ? <IconPlus width={12} height={12} /> : <IconX width={12} height={12} />}
                        </span>
                      )}
                    </button>
                  ) : node.kind === "root" ? (
                    <div className="flex h-full w-full items-center justify-center rounded-xl border border-indigo-500 bg-indigo-600 px-2 text-center text-sm font-bold text-white shadow">
                      <span className="line-clamp-2">{node.label}</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-lg border border-line bg-surface px-2 text-center text-[11px] leading-tight text-ink shadow-sm">
                      <span className="line-clamp-2">{node.label}</span>
                    </div>
                  )}
                </foreignObject>
              );
            })}
          </g>
        </g>
      </svg>
      <p className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-muted">
        Scroll to zoom · drag to pan · click a section to collapse
      </p>
    </div>
  );
}

