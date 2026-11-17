// Draws a QR-like 29x29 module pattern into an SVG <g>. Visual placeholder only, not scannable.
function drawQR(g, seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const N = 29, ns = 'http://www.w3.org/2000/svg';
  const inFinder = (x, y) => [[0, 0], [N - 7, 0], [0, N - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
  const rect = (x, y, w, hgt) => { const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', w); r.setAttribute('height', hgt); g.appendChild(r); };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rand() > 0.52) rect(x, y, 1, 1);
  for (const [fx, fy] of [[0, 0], [N - 7, 0], [0, N - 7]]) {
    rect(fx, fy, 7, 1); rect(fx, fy + 6, 7, 1); rect(fx, fy, 1, 7); rect(fx + 6, fy, 1, 7); rect(fx + 2, fy + 2, 3, 3);
  }
}
