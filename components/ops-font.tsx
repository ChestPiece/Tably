import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], display: "swap" });

// Owner and staff screens read in Inter (design.md § Type). Guest pages keep Fraunces + Plex,
// and Arabic keeps its own stacks (the :lang(ar) rule in globals.css still wins there).
// Set on :root, not a wrapper, so dialogs and toasts portalled to <body> get it too.
export function OpsFont() {
  const stack = `${inter.style.fontFamily}, system-ui, sans-serif`;
  return <style>{`:root:not(:lang(ar)) { --font-sans: ${stack}; --font-display: ${stack}; }`}</style>;
}
