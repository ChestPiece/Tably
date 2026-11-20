"use client";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Landing motion (GSAP + Lenis), ported from brand-demos/tably/landing-a.html.
 * Works on the static markup inside `.tl`. Reduced motion: short fade, no smooth scroll, no loops.
 * Removes `data-wait` from the root once the intro has set its start states.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".tl");
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const ready = () => root.removeAttribute("data-wait");
    const $ = <T extends Element = HTMLElement>(s: string, c: ParentNode = root) => c.querySelector<T>(s)!;
    const $$ = <T extends Element = HTMLElement>(s: string, c: ParentNode = root) => Array.from(c.querySelectorAll<T>(s));
    const OUT = "power3.out";
    const cleanups: (() => void)[] = [];
    const on = (el: EventTarget, ev: string, fn: EventListener) => {
      el.addEventListener(ev, fn);
      cleanups.push(() => el.removeEventListener(ev, fn));
    };

    /* interactive cards (every mode) */
    const touched = { sw: false, lang: false };
    const swatches = $$<HTMLButtonElement>(".swatches button");
    const brandTop = $(".brand-demo .top");
    const setSwatch = (btn: HTMLButtonElement) => {
      swatches.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      gsap.to(brandTop, { backgroundColor: btn.dataset.c, duration: 0.35, ease: "power2.inOut", overwrite: true });
    };
    swatches.forEach((b) => on(b, "click", () => { touched.sw = true; setSwatch(b); }));

    const langBtns = $$<HTMLButtonElement>(".seg button");
    const pill = $(".seg .pill"), dish = $(".dish"), dname = $(".dname"), dprice = $(".dprice");
    const LANG: Record<string, [string, string, string]> = { en: ["Mint lemonade", "16.00", "ltr"], ar: ["ليمون بالنعناع", "١٦٫٠٠", "rtl"] };
    const setLang = (btn: HTMLButtonElement, instant = false) => {
      langBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      gsap.to(pill, { x: btn.offsetLeft, width: btn.offsetWidth, duration: instant ? 0 : 0.4, ease: "power3.inOut", overwrite: true });
      const l = LANG[btn.dataset.l ?? "en"];
      const apply = () => { dname.textContent = l[0]; dprice.textContent = l[1]; dish.dir = l[2]; dname.lang = btn.dataset.l ?? "en"; };
      if (instant) return apply();
      gsap.timeline()
        .to([dname, dprice], { autoAlpha: 0, y: -4, filter: "blur(2px)", duration: 0.16, ease: "power2.in" })
        .add(apply)
        .fromTo([dname, dprice], { y: 4 }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.32, ease: OUT });
    };
    langBtns.forEach((b) => on(b, "click", () => { touched.lang = true; setLang(b); }));

    const rows = $$(".prices div");
    let ri = 0;
    const nextPrice = () => { rows[ri].classList.remove("on"); ri = (ri + 1) % rows.length; rows[ri].classList.add("on"); };

    const inView = (el: Element, tl: gsap.core.Timeline) =>
      ScrollTrigger.create({ trigger: el, start: "top bottom", end: "bottom top", onToggle: (s) => (s.isActive ? tl.play() : tl.pause()) });
    const rise = (targets: gsap.TweenTarget, trigger: string | Element, extra: gsap.TweenVars = {}) =>
      gsap.from(targets, { autoAlpha: 0, y: 20, duration: 0.7, ease: OUT, stagger: 0.08, scrollTrigger: { trigger, start: "top 84%", once: true }, ...extra });

    let mm: gsap.MatchMedia | undefined;
    let dead = false;
    document.fonts.ready.then(() => {
      if (dead) return;
      setLang($<HTMLButtonElement>(".seg button[aria-pressed=true]"), true);
      mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", fine: "(hover: hover) and (pointer: fine)", wide: "(min-width: 961px)" }, (ctx) => {
        const c = ctx.conditions as { motion: boolean; fine: boolean; wide: boolean };
        if (!c.motion) {
          gsap.from($$("header, main"), { autoAlpha: 0, duration: 0.2 });
          ready();
          return;
        }
        const local: (() => void)[] = [];
        const lon = (el: EventTarget, ev: string, fn: EventListener) => { el.addEventListener(ev, fn); local.push(() => el.removeEventListener(ev, fn)); };

        /* smooth scroll: Lenis is the only engine */
        const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on("scroll", ScrollTrigger.update);
        const raf = (t: number) => lenis.raf(t * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        $$<HTMLAnchorElement>('a[href^="#"]').forEach((a) =>
          lon(a, "click", (e) => {
            const id = a.getAttribute("href") ?? "";
            const t = id.length > 1 ? root.querySelector<HTMLElement>(id) : null;
            if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.1 }); }
          }),
        );

        /* hero intro */
        const h1 = SplitText.create($(".hero h1"), { type: "lines", mask: "lines" });
        const intro = gsap.timeline({ defaults: { ease: OUT } });
        intro
          .from($$("header nav > *"), { autoAlpha: 0, y: -8, duration: 0.6, stagger: 0.06 })
          .from(h1.lines, { yPercent: 105, duration: 1, stagger: 0.09, onComplete: () => h1.revert() }, 0.1)
          .from($$(".hero .lead, .hero .btns, .hero .facts"), { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.07 }, 0.45)
          .from($(".h-table"), { autoAlpha: 0, scale: 0.96, transformOrigin: "50% 50%", duration: 1.1 }, 0.15)
          .from($$(".h-obj"), { autoAlpha: 0, y: -14, rotation: (i: number) => [-4, 3, -3, 4, -3][i], transformOrigin: "50% 50%", duration: 0.9, stagger: 0.08 }, 0.4)
          .from($$(".note"), { autoAlpha: 0, y: 8, scale: 0.96, duration: 0.5, stagger: 0.12 }, 1.05);

        /* hero service loop: scan, order, served */
        const notes = $$(".note"), card = $(".h-card"), phone = $(".h-phone"), plate = $(".h-plate");
        const scan = $(".h-scan"), tap = $(".h-tap"), steam = $(".h-steam");
        const act = (i: number) => () => notes.forEach((n, k) => n.classList.toggle("on", k === i));
        const loop = gsap.timeline({ repeat: -1, paused: true, defaults: { ease: "sine.inOut" } });
        loop
          .call(act(0), undefined, 0.01)
          .to(card, { y: -5, duration: 0.5 }, 0)
          .fromTo(scan, { y: 0, opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.3)
          .to(scan, { y: 74, duration: 0.9, ease: "power1.inOut", yoyo: true, repeat: 1 }, 0.3)
          .to(scan, { opacity: 0, duration: 0.2 }, 2.1)
          .to(card, { y: 0, duration: 0.6 }, 2.1)
          .call(act(1), undefined, 2.7)
          .to(phone, { y: -5, duration: 0.5 }, 2.7)
          .fromTo(tap, { scale: 0.5, opacity: 0.9, transformOrigin: "50% 50%" }, { scale: 1.9, opacity: 0, duration: 0.7, ease: "power2.out", repeat: 1, repeatDelay: 0.25 }, 3.1)
          .to(phone, { y: 0, duration: 0.6 }, 4.8)
          .call(act(2), undefined, 5.4)
          .to(plate, { y: -6, duration: 0.55, ease: "power2.out" }, 5.4)
          .fromTo(steam, { opacity: 0, y: 6 }, { opacity: 0.9, y: -2, duration: 0.9 }, 5.6)
          .to(plate, { y: 0, duration: 0.7, ease: "power2.inOut" }, 6.0)
          .to(steam, { opacity: 0, y: -12, duration: 0.9 }, 6.6)
          .to({}, { duration: 0.01 }, 8);
        let introDone = false;
        const heroST = ScrollTrigger.create({
          trigger: $(".hero"), start: "top bottom", end: "bottom top",
          onToggle: (s) => { if (!introDone) return; if (s.isActive) loop.play(); else loop.pause(); },
        });
        intro.eventCallback("onComplete", () => { introDone = true; if (heroST.isActive) loop.play(); });

        const scene = $(".scene");
        lon(scene, "mouseenter", () => { gsap.to(loop, { timeScale: 0, duration: 0.5, ease: "power2.out", overwrite: true }); });
        lon(scene, "mouseleave", () => { gsap.to(loop, { timeScale: 1, duration: 0.5, ease: "power2.in", overwrite: true }); });

        /* hero pointer parallax, fine pointers only */
        if (c.fine && c.wide) {
          const hero = $(".hero");
          const layers = $$(".px").map((el) => ({
            d: Number(el.dataset.depth),
            x: gsap.quickTo(el, "x", { duration: 0.8, ease: "power3" }),
            y: gsap.quickTo(el, "y", { duration: 0.8, ease: "power3" }),
          }));
          lon(hero, "mousemove", (ev) => {
            const e = ev as MouseEvent, r = hero.getBoundingClientRect();
            const nx = ((e.clientX - r.left) / r.width) * 2 - 1, ny = ((e.clientY - r.top) / r.height) * 2 - 1;
            layers.forEach((l) => { l.x(nx * l.d); l.y(ny * l.d); });
          });
          const rest = () => layers.forEach((l) => { l.x(0); l.y(0); });
          lon(hero, "mouseleave", rest);
          lon(window, "blur", rest);
        }

        /* section headings: words rise inside line masks */
        $$("section.block h2, .cta h2").forEach((h) => {
          const sp = SplitText.create(h, { type: "words,lines", mask: "lines" });
          gsap.from(sp.words, { yPercent: 110, duration: 0.8, ease: OUT, stagger: 0.04, scrollTrigger: { trigger: h, start: "top 86%", once: true }, onComplete: () => sp.revert() });
        });
        $$(".head").forEach((hd) => rise($("p", hd), hd, { delay: 0.25 }));

        /* how it works */
        rise($$(".step"), $(".steps"), { stagger: 0.1, y: 24 });
        const s1 = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 });
        const s1scan = $(".s1-scan");
        s1.fromTo(s1scan, { y: 0, opacity: 0 }, { opacity: 1, duration: 0.15 }, 0)
          .to(s1scan, { y: 56, duration: 0.8, ease: "power1.inOut", yoyo: true, repeat: 1 }, 0)
          .to(s1scan, { opacity: 0, duration: 0.15 }, 1.6)
          .to($(".s1-corners"), { scale: 1.06, transformOrigin: "50% 50%", duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, 1.6)
          .to($(".s1-pill"), { scale: 0.92, transformOrigin: "50% 50%", duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1 }, 2.3)
          .to({}, { duration: 0.8 });
        inView($(".step:nth-child(1) .art"), s1);

        const s2 = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.4 });
        const pop = { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" };
        const popFrom = { autoAlpha: 0, y: 8, scale: 0.94, transformOrigin: "50% 50%" };
        const s2a = $(".s2-a"), s2b = $(".s2-b");
        s2.fromTo(s2a, popFrom, pop, 0.3)
          .fromTo(s2b, popFrom, pop, 1.1)
          .to([s2a, s2b], { autoAlpha: 0, y: -6, duration: 0.35, ease: "power2.in", stagger: 0.08 }, 3.2);
        inView($(".step:nth-child(2) .art"), s2);

        const spans = $$(".track span"), s3plate = $(".s3-plate");
        const s3 = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.3 });
        s3.set(spans, { opacity: 0.35 }, 0).set($$(".track i"), { scale: 0.6 }, 0).to(s3plate, { y: -4, duration: 0.4, ease: "power2.out" }, 0);
        spans.forEach((sp, i) => {
          s3.to(sp, { opacity: 1, duration: 0.3, ease: OUT }, 0.4 + i * 0.8).to($("i", sp), { scale: 1, duration: 0.45, ease: "back.out(2.2)" }, 0.4 + i * 0.8);
        });
        s3.to(s3plate, { y: 0, duration: 0.6, ease: "power2.inOut" }, 2.2).to({}, { duration: 1.4 });
        inView($(".step:nth-child(3) .art"), s3);

        /* team: live kitchen board */
        rise($(".team-grid > svg"), $(".team-grid"), { y: 28, duration: 0.9 });
        rise($$(".feats li"), $(".feats"), { x: 16, y: 0, stagger: 0.07 });
        const clock = $(".b-clock"), count = $(".b-count"), bNew = $(".b-new"), bBar = $(".b-bar"), bProg = $(".b-prog"), bT7 = $(".b-t7");
        const txt = (el: Element, t: string) => () => { el.textContent = t; };
        const board = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.6 });
        board
          .set(bNew, { autoAlpha: 0, x: -16 }, 0)
          .set(bBar, { scaleY: 0, transformOrigin: "50% 0%" }, 0)
          .set(bProg, { transformOrigin: "0% 50%" }, 0)
          .call(txt(count, "New · 1"), undefined, 0.01)
          .to(bNew, { autoAlpha: 1, x: 0, duration: 0.7, ease: OUT }, 0.4)
          .call(txt(count, "New · 2"), undefined, 0.5)
          .to(bBar, { scaleY: 1, duration: 0.5, ease: OUT }, 0.8)
          .to($(".b-bell"), { rotation: 14, transformOrigin: "50% 20%", duration: 0.09, ease: "sine.inOut", yoyo: true, repeat: 5 }, 1.4)
          .to(bProg, { scaleX: 1.5, duration: 1, ease: "power2.inOut" }, 2.2)
          .to(clock, { autoAlpha: 0, duration: 0.15 }, 3.0)
          .call(txt(clock, "Today · 19:43"), undefined, 3.15)
          .to(clock, { autoAlpha: 1, duration: 0.25 }, 3.16)
          .to($(".b-served"), { scale: 0.93, transformOrigin: "50% 50%", duration: 0.12, ease: "power2.out", yoyo: true, repeat: 1 }, 3.8)
          .to(bT7, { autoAlpha: 0, y: 6, duration: 0.45, ease: "power2.in" }, 4.15)
          /* ease everything back so the repeat has no snap */
          .to(bNew, { autoAlpha: 0, x: -16, duration: 0.45, ease: "power2.in" }, 6.2)
          .to(bProg, { scaleX: 1, duration: 0.6, ease: "power2.inOut" }, 6.2)
          .to(bT7, { autoAlpha: 1, y: 0, duration: 0.6, ease: OUT }, 6.4)
          .to(clock, { autoAlpha: 0, duration: 0.15 }, 6.4)
          .call(txt(clock, "Today · 19:42"), undefined, 6.55)
          .to(clock, { autoAlpha: 1, duration: 0.25 }, 6.56);
        inView($(".team-grid > svg"), board);

        /* your restaurant: cards + gentle auto demo until the visitor takes over */
        rise($$(".card"), $(".cards"), { stagger: 0.1, y: 24 });
        let sw = 0, lt = 0;
        const demo = gsap.timeline({ repeat: -1, paused: true });
        demo
          .call(() => { if (!touched.sw) { sw = (sw + 1) % swatches.length; setSwatch(swatches[sw]); } }, undefined, 0.8)
          .call(nextPrice, undefined, 1.6)
          .call(() => { if (!touched.lang && ++lt % 2 === 0) setLang(langBtns[(lt / 2) % 2]); }, undefined, 2.4)
          .to({}, { duration: 0.01 }, 2.6);
        inView($(".cards"), demo);

        /* cta: cards fan out with scroll */
        rise($(".cta > div"), $(".cta"), { y: 24 });
        gsap.timeline({ scrollTrigger: { trigger: $(".cta"), start: "top 92%", end: "center 55%", scrub: 0.6 } })
          .from($(".c-circle"), { scale: 0.94, transformOrigin: "50% 50%", ease: "none" }, 0)
          .from($(".c-a"), { rotation: 8, x: 34, svgOrigin: "170 160", ease: "none" }, 0)
          .from($(".c-b"), { rotation: -7, x: -34, svgOrigin: "170 160", ease: "none" }, 0);

        /* footer */
        rise($$(".foot-top > *"), $(".foot-top"), { stagger: 0.06, y: 16 });
        const fw = SplitText.create($(".foot-mark b"), { type: "chars" });
        gsap.from(fw.chars, { yPercent: 40, autoAlpha: 0, duration: 0.9, ease: OUT, stagger: 0.04, scrollTrigger: { trigger: $(".foot-mark"), start: "top 92%", once: true }, onComplete: () => fw.revert() });
        gsap.from($$(".f-obj"), { autoAlpha: 0, y: -12, duration: 0.8, ease: OUT, stagger: 0.08, scrollTrigger: { trigger: $(".foot-mark"), start: "top 92%", once: true } });

        ready();
        if (document.readyState === "complete") ScrollTrigger.refresh();
        else lon(window, "load", () => ScrollTrigger.refresh());

        return () => {
          local.forEach((f) => f());
          gsap.ticker.remove(raf);
          lenis.destroy();
        };
      });
    });

    return () => {
      dead = true;
      mm?.revert();
      cleanups.forEach((f) => f());
      ready();
    };
  }, []);
  return null;
}
