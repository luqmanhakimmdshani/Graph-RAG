import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

// index.html applies the same choice before first paint, so there's no flash.
export function savedTheme(): Theme {
  try {
    const t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") return t;
  } catch {
    /* storage blocked: fall through to the OS preference */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function saveTheme(t: Theme) {
  try {
    localStorage.setItem("theme", t);
  } catch {
    /* not persisted, still applied for this visit */
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The theme on <html> right now; re-renders when the toggle flips it. */
export function useAppliedTheme(): Theme {
  return useSyncExternalStore(subscribe, () =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
}
