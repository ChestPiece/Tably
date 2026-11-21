"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore, type ComponentType } from "react";
import { createPortal } from "react-dom";

// The landing markup is static HTML; each product demo mounts into its empty
// [data-demo] slot. Loaded on the client only, so the page itself stays light.
const DEMOS: Record<string, ComponentType> = {
  hero: dynamic(() => import("./demos/HeroDemo"), { ssr: false }),
  board: dynamic(() => import("./demos/BoardDemo"), { ssr: false }),
  menu: dynamic(() => import("./demos/MenuEditDemo"), { ssr: false }),
};

type Slot = [string, Element];
const NONE: Slot[] = [];
const subscribe = () => () => {};
// Cached per landing root, so the snapshot is stable until the page is remounted
let cache: { root: Element | null; slots: Slot[] } = { root: null, slots: NONE };
function getSlots() {
  const root = document.querySelector(".tl");
  if (root !== cache.root) {
    const slots = Array.from(root?.querySelectorAll("[data-demo]") ?? [])
      .map((el) => [el.getAttribute("data-demo") ?? "", el] as Slot)
      .filter(([k]) => DEMOS[k]);
    cache = { root, slots };
  }
  return cache.slots;
}

export function LandingDemos() {
  // Empty on the server and in the first hydration pass, the slots after
  const slots = useSyncExternalStore(subscribe, getSlots, () => NONE);
  return (
    <>
      {slots.map(([k, el]) => {
        const Demo = DEMOS[k];
        return createPortal(<Demo />, el, k);
      })}
    </>
  );
}
