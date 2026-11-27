// Paste into the browser console at each viewport size (see design.md "Responsive").
// Lists elements that poke past the viewport (hidden by overflow-x: clip, so easy to miss),
// page scroll on pages that should fit the screen, and primary actions outside the viewport.
(() => {
  const W = innerWidth, H = innerHeight, out = [];
  // Skip things meant to be off-screen: sr-only, closed sheets, horizontal scrollers' children.
  const scrollsX = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return true; } return false; };
  for (const el of document.body.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (!r.width || el.closest(".sr-only,[aria-hidden=true],[data-state=closed]")) continue;
    if ((r.right > W + 1 || r.left < -1) && !scrollsX(el)) out.push(["overflow-x", el, Math.round(r.left), Math.round(r.right)]);
  }
  const fit = matchMedia("(min-width: 1280px) and (min-height: 760px)").matches;
  const scroller = [...document.querySelectorAll("main, [data-slot=sidebar-inset] *")].find((e) => e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY === "auto");
  if (document.documentElement.scrollHeight > H + 1 && document.querySelector("[data-slot=sidebar-inset]")) out.push(["page scrolls in ops shell", document.documentElement.scrollHeight]);
  if (fit && /page=(home|profit)|\/admin\/?$/.test(location.href) && scroller) out.push(["fit page scrolls", scroller]);
  for (const b of document.querySelectorAll("[data-primary], button[type=submit]")) {
    const r = b.getBoundingClientRect();
    if (r.width && (r.bottom > H + 1 || r.right > W + 1)) out.push(["primary action off-screen", b]);
  }
  console.log(out.length ? out : `OK ${W}x${H}`);
  return out.length ? out.map((o) => o[0]) : `OK ${W}x${H}`;
})();
