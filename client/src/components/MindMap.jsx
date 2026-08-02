// FLOW: MindMap component for NoteGenie.
// Parses document notes into interactive, color-coded, high-detail radial concept tree.

import { useMemo, useRef, useState } from "react";
import { parseNoteSections } from "../utils/parseNoteSections.js";
import { IconPlus, IconX } from "./icons.jsx";

const PALETTES = [
  { border: "border-emerald-300 dark:border-emerald-800", bg: "bg-emerald-50/90 dark:bg-emerald-950/70", text: "text-emerald-800 dark:text-emerald-200", line: "#10b981" },
  { border: "border-indigo-300 dark:border-indigo-800", bg: "bg-indigo-50/90 dark:bg-indigo-950/70", text: "text-indigo-800 dark:text-indigo-200", line: "#6366f1" },
  { border: "border-amber-300 dark:border-amber-800", bg: "bg-amber-50/90 dark:bg-amber-950/70", text: "text-amber-800 dark:text-amber-200", line: "#f59e0b" },
  { border: "border-purple-300 dark:border-purple-800", bg: "bg-purple-50/90 dark:bg-purple-950/70", text: "text-purple-800 dark:text-purple-200", line: "#a855f7" },
  { border: "border-rose-300 dark:border-rose-800", bg: "bg-rose-50/90 dark:bg-rose-950/70", text: "text-rose-800 dark:text-rose-200", line: "#f43f5e" },
  { border: "border-sky-300 dark:border-sky-800", bg: "bg-sky-50/90 dark:bg-sky-950/70", text: "text-sky-800 dark:text-sky-200", line: "#06b6d4" },
];

function cleanNodeLabel(text) {
  return String(text || "")
    .replace(/\\r\\n/g, " ")
    .replace(/\\n/g, " ")
    .replace(/\r\n/g, " ")
    .replace(/\r|\n/g, " ")
    .replace(/\|/g, "")
    .replace(/[:-]{2,}/g, "")
    .replace(/[*`_#><]/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLeaves(body = "", limit = 5) {
  const leaves = [];
  const lines = String(body).split("\n");

  // 1. Try bullet points and bold keywords
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.includes(":---") || trimmedLine.includes("---")) continue;

    const m = trimmedLine.match(/^\s*[-*+\d.]+\s+(.+)/);
    if (!m) continue;

    const bold = m[1].match(/\*\*(.+?)\*\*/);
    let label = cleanNodeLabel(bold ? bold[1] : m[1]);

    if (label && label.length >= 3 && !label.includes("---") && !leaves.includes(label)) {
      if (label.length > 48) label = `${label.slice(0, 45)}…`;
      leaves.push(label);
      if (leaves.length >= limit) break;
    }
  }

  // 2. Try markdown table cells if bullets < 3
  if (leaves.length < 3) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.includes(":---") || trimmedLine.includes("---")) continue;

      if (trimmedLine.includes("|")) {
        const cells = trimmedLine.split("|").map(cleanNodeLabel).filter((c) => c.length >= 3 && c.length <= 50 && !c.includes("---"));
        for (const cell of cells) {
          if (!leaves.includes(cell)) {
            leaves.push(cell);
            if (leaves.length >= limit) break;
          }
        }
      }
      if (leaves.length >= limit) break;
    }
  }

  // 3. Try sentences & clauses if bullets < 3
  if (leaves.length < 3) {
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("|") || trimmedLine.includes(":---") || trimmedLine.includes("---")) continue;

      let clean = cleanNodeLabel(trimmedLine);
      if (!clean || clean.length < 5) continue;

      // Split into sentences and clauses
      const parts = clean.split(/[.!?;,]\s+/);
      for (let s of parts) {
        s = cleanNodeLabel(s);
        if (s.length >= 5 && !leaves.includes(s)) {
          let formatted = s.length > 48 ? `${s.slice(0, 45)}…` : s;
          leaves.push(formatted);
          if (leaves.length >= limit) break;
        }
      }
      if (leaves.length >= limit) break;
    }
  }

  // 4. Ultimate Fallback: Truncate any long text block into logical chunks
  if (leaves.length === 0) {
    const fullClean = cleanNodeLabel(body);
    if (fullClean) {
      const words = fullClean.split(/\s+/);
      for (let i = 0; i < words.length; i += 6) {
        const chunk = words.slice(i, i + 6).join(" ");
        if (chunk.length >= 4 && !leaves.includes(chunk)) {
          let label = chunk.length > 45 ? `${chunk.slice(0, 42)}…` : chunk;
          leaves.push(label);
          if (leaves.length >= limit) break;
        }
      }
    }
  }

  return leaves;
}

function buildTree(title, sections) {
  return {
    title: cleanNodeLabel(title) || "Notes Overview",
    branches: sections
      .filter((s) => !s.title.includes("---") && s.title.length >= 2)
      .slice(0, 14)
      .map((s, i) => ({
        title: cleanNodeLabel(s.title),
        slug: s.slug,
        leaves: extractLeaves(s.body, 5),
        palette: PALETTES[i % PALETTES.length],
      })),
  };
}

// Spaced radial layout
function layout(tree, collapsed) {
  const nodes = [{ id: "root", kind: "root", label: tree.title, x: 0, y: 0 }];
  const links = [];
  const n = tree.branches.length || 1;
  const R1 = Math.max(280, 120 + n * 26);

  tree.branches.forEach((b, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const bx = Math.cos(angle) * R1;
    const by = Math.sin(angle) * R1;
    const bid = `b-${i}`;
    nodes.push({
      id: bid,
      kind: "branch",
      label: b.title,
      slug: b.slug,
      x: bx,
      y: by,
      count: b.leaves.length,
      palette: b.palette,
    });
    links.push({ from: "root", to: bid, x1: 0, y1: 0, x2: bx, y2: by, color: b.palette.line });

    if (collapsed.has(b.slug)) return;
    const m = b.leaves.length;
    const spread = Math.min(Math.PI * 0.9, 0.46 * m);
    const R2 = 210;

    b.leaves.forEach((leaf, j) => {
      const la = angle + (m > 1 ? (j - (m - 1) / 2) * (spread / (m - 1 || 1)) : 0);
      const lx = bx + Math.cos(la) * R2;
      const ly = by + Math.sin(la) * R2;
      const lid = `l-${i}-${j}`;
      nodes.push({
        id: lid,
        kind: "leaf",
        label: leaf,
        x: lx,
        y: ly,
        palette: b.palette,
      });
      links.push({ from: bid, to: lid, x1: bx, y1: by, x2: lx, y2: ly, color: b.palette.line });
    });
  });

  return { nodes, links };
}

const NODE = {
  root: { w: 210, h: 58 },
  branch: { w: 185, h: 52 },
  leaf: { w: 165, h: 44 },
};

const VIEW_W = 1200;
const VIEW_H = 820;

export default function MindMap({ title, notes }) {
  const sections = useMemo(() => parseNoteSections(notes || ""), [notes]);
  const tree = useMemo(() => buildTree(title, sections), [title, sections]);
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.68 });
  const drag = useRef(null);

  const { nodes, links } = useMemo(() => layout(tree, collapsed), [tree, collapsed]);

  if (!sections.length) {
    return (
      <div className="grid place-items-center py-16 text-center text-sm text-muted">
        Generate notes with section headings to see an interactive mind map.
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
    setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.35, v.scale * factor)) }));
  }

  function onPointerDown(e) {
    drag.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = rect.width ? VIEW_W / rect.width : 1;
    const dx = (e.clientX - d.sx) * k;
    const dy = (e.clientY - d.sy) * k;
    setView((v) => ({
      ...v,
      x: d.ox + dx,
      y: d.oy + dy,
    }));
  }

  function onPointerUp() {
    drag.current = null;
  }

  const zoom = (factor) =>
    setView((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.35, v.scale * factor)) }));
  const reset = () => setView({ x: 0, y: 0, scale: 0.68 });

  return (
    <div className="relative h-[620px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900/5 shadow-inner dark:border-slate-800 dark:bg-slate-950/40">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-surface/90 p-1.5 shadow-xs backdrop-blur-sm dark:border-slate-800">
        <button type="button" onClick={() => zoom(1.15)} className="btn-outline px-2 py-1 text-xs" aria-label="Zoom in">
          <IconPlus width={14} height={14} />
        </button>
        <button type="button" onClick={() => zoom(0.87)} className="btn-outline px-2 py-1 text-xs" aria-label="Zoom out">
          <span className="block h-[14px] w-[14px] text-center leading-[14px]">−</span>
        </button>
        <button type="button" onClick={reset} className="btn-outline px-2.5 py-1 text-xs" aria-label="Reset view">
          Reset View
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
          {/* Connector Paths */}
          <g>
            {links.map((l) => (
              <path
                key={`${l.from}-${l.to}`}
                d={`M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`}
                stroke={l.color || "#94a3b8"}
                strokeOpacity={0.45}
                fill="none"
                strokeWidth={2}
              />
            ))}
          </g>

          {/* Map Nodes */}
          <g>
            {nodes.map((node) => {
              const dim = NODE[node.kind] || NODE.leaf;
              const palette = node.palette || PALETTES[0];
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
                      title={collapsed.has(node.slug) ? "Expand branch" : "Collapse branch"}
                      className={`flex h-full w-full items-center justify-between gap-1.5 rounded-xl border p-2.5 text-left shadow-sm transition-all hover:scale-105 ${palette.border} ${palette.bg} ${palette.text}`}
                    >
                      <span className="line-clamp-2 text-xs font-bold leading-tight">{node.label}</span>
                      {node.count > 0 && (
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/80 dark:bg-black/40 text-[10px]">
                          {collapsed.has(node.slug) ? <IconPlus width={10} height={10} /> : <IconX width={10} height={10} />}
                        </span>
                      )}
                    </button>
                  ) : node.kind === "root" ? (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-accent-500 bg-accent-600 px-3 text-center text-sm font-bold text-white shadow-md">
                      <span className="line-clamp-2">{node.label}</span>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-xl border border-slate-200 bg-surface/90 px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight text-ink shadow-2xs dark:border-slate-800">
                      <span className="line-clamp-2">{node.label}</span>
                    </div>
                  )}
                </foreignObject>
              );
            })}
          </g>
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur-sm border border-slate-200/80 dark:border-slate-800">
        <span>🖱️ Drag to pan</span>
        <span>·</span>
        <span>🔍 Scroll to zoom</span>
        <span>·</span>
        <span>💡 Click branches to expand/collapse</span>
      </div>
    </div>
  );
}
