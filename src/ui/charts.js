// Grafici SVG semplici: barre con linea obiettivo e fasce orarie (ora di letto -> sveglia).
const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  if (parent) parent.appendChild(el);
  return el;
}

function text(parent, x, y, value, attrs = {}) {
  const t = svgEl("text", { x, y, class: "ch-txt", ...attrs }, parent);
  t.textContent = value;
  return t;
}

function frame(width, height, label) {
  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label, class: "chart" });
  return svg;
}

/**
 * Barre verticali. items: [{ label, value, cls }], value in minuti.
 * target: linea tratteggiata (minuti). Asse in ore.
 */
export function barChart({ items, target, label }) {
  const W = 340, H = 190, L = 26, R = 8, T = 14, B = 22;
  const top = Math.max(target ?? 0, ...items.map((i) => i.value), 60);
  const maxH = Math.ceil(top / 60 / 2) * 2;
  const y = (min) => T + (1 - min / (maxH * 60)) * (H - T - B);
  const slot = (W - L - R) / Math.max(items.length, 1);
  const svg = frame(W, H, label);
  for (let hh = 0; hh <= maxH; hh += 2) {
    svgEl("line", { x1: L, x2: W - R, y1: y(hh * 60), y2: y(hh * 60), class: "ch-grid" }, svg);
    text(svg, L - 6, y(hh * 60) + 3, `${hh}h`, { "text-anchor": "end" });
  }
  const bw = Math.min(16, slot * 0.6);
  items.forEach((it, i) => {
    const x = L + slot * i + slot / 2;
    if (it.value > 0) svgEl("rect", { x: x - bw / 2, y: y(it.value), width: bw, height: y(0) - y(it.value), rx: 4, class: `ch-bar ${it.cls ?? ""}` }, svg);
    if (items.length <= 14 || i % 2 === 0) text(svg, x, H - 6, it.label, { "text-anchor": "middle" });
  });
  if (target) {
    svgEl("line", { x1: L, x2: W - R, y1: y(target), y2: y(target), class: "ch-target" }, svg);
  }
  return svg;
}

/** Arrotonda verso l'alto a un valore "bello" per l'asse (1, 2, 5 x 10^n). */
function niceMax(value) {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((s) => s * exp >= value);
  return step * exp;
}

/** Barre generiche. items: [{ label, value, cls }]; format(v) per le etichette dell'asse. */
export function columnChart({ items, label, format = String, target }) {
  const W = 340, H = 180, L = 40, R = 8, T = 12, B = 22;
  const max = niceMax(Math.max(0, target ?? 0, ...items.map((i) => i.value)));
  const every = Math.ceil(items.length / 8);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const slot = (W - L - R) / Math.max(items.length, 1);
  const svg = frame(W, H, label);
  [0, 0.5, 1].forEach((f) => {
    svgEl("line", { x1: L, x2: W - R, y1: y(max * f), y2: y(max * f), class: "ch-grid" }, svg);
    text(svg, L - 6, y(max * f) + 3, format(max * f), { "text-anchor": "end" });
  });
  const bw = Math.max(2, Math.min(18, slot * 0.6));
  items.forEach((it, i) => {
    const x = L + slot * i + slot / 2;
    if (it.value > 0) svgEl("rect", { x: x - bw / 2, y: y(it.value), width: bw, height: y(0) - y(it.value), rx: Math.min(4, bw / 2), class: `ch-bar ${it.cls ?? ""}` }, svg);
    const isLast = i === items.length - 1;
    if ((items.length - 1 - i) % every === 0 || isLast) text(svg, x, H - 6, it.label, { "text-anchor": isLast && items.length > 8 ? "end" : "middle" });
  });
  if (target) svgEl("line", { x1: L, x2: W - R, y1: y(target), y2: y(target), class: "ch-target" }, svg);
  return svg;
}

/** Linea con punti. points: [{ label, value }] in ordine di tempo. */
export function lineChart({ points, label, format = String }) {
  const W = 340, H = 180, L = 40, R = 14, T = 16, B = 22;
  if (points.length === 0) return frame(W, H, label);
  const values = points.map((p) => p.value);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.15, 0.5);
  lo -= pad;
  hi += pad;
  const x = (i) => (points.length === 1 ? (L + W - R) / 2 : L + (i / (points.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const svg = frame(W, H, label);
  [lo, (lo + hi) / 2, hi].forEach((v) => {
    svgEl("line", { x1: L, x2: W - R, y1: y(v), y2: y(v), class: "ch-grid" }, svg);
    text(svg, L - 6, y(v) + 3, format(v), { "text-anchor": "end" });
  });
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  svgEl("path", { d, class: "ch-line" }, svg);
  points.forEach((p, i) => {
    const last = i === points.length - 1;
    svgEl("circle", { cx: x(i), cy: y(p.value), r: last ? 4.5 : 2.6, class: last ? "ch-dot last" : "ch-dot" }, svg);
  });
  const idx = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
  idx.forEach((i) => text(svg, x(i), H - 6, points[i].label, { "text-anchor": i === 0 && points.length > 1 ? "start" : i === points.length - 1 && points.length > 1 ? "end" : "middle" }));
  return svg;
}

/**
 * Fasce orarie: per ogni notte una barra dall'ora di letto alla sveglia.
 * nights: [{ label, start, end }] in minuti dalla mezzanotte del giorno prima (es. 23:00 = 1380, 07:00 = 1860).
 */
export function rangeChart({ nights, label }) {
  const W = 340, H = 220, L = 38, R = 8, T = 10, B = 22;
  const starts = nights.map((n) => n.start);
  const ends = nights.map((n) => n.end);
  const lo = Math.floor(Math.min(1320, ...starts) / 120) * 120;
  const hi = Math.ceil(Math.max(1920, ...ends) / 120) * 120;
  const y = (m) => T + ((m - lo) / (hi - lo)) * (H - T - B);
  const slot = (W - L - R) / Math.max(nights.length, 1);
  const svg = frame(W, H, label);
  for (let m = lo; m <= hi; m += 120) {
    svgEl("line", { x1: L, x2: W - R, y1: y(m), y2: y(m), class: "ch-grid" }, svg);
    text(svg, L - 6, y(m) + 3, `${String(Math.floor((m % 1440) / 60)).padStart(2, "0")}:00`, { "text-anchor": "end" });
  }
  const bw = Math.min(14, slot * 0.55);
  nights.forEach((n, i) => {
    const x = L + slot * i + slot / 2;
    svgEl("rect", { x: x - bw / 2, y: y(n.start), width: bw, height: Math.max(2, y(n.end) - y(n.start)), rx: bw / 2, class: `ch-range ${n.cls ?? ""}` }, svg);
    if (nights.length <= 14 || i % 2 === 0) text(svg, x, H - 6, n.label, { "text-anchor": "middle" });
  });
  return svg;
}
