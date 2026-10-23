import React from "react";

/** WebGL2 available? Checked once, on a throwaway canvas. */
let cached: boolean | undefined;
export function hasWebGL2() {
  if (cached === undefined) {
    try { cached = !!document.createElement("canvas").getContext("webgl2"); } catch { cached = false; }
  }
  return cached;
}

/** The fallback where the 3D view can't run: a short message above the tool's own 2D view. */
export const No3D: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full flex-col">
    <p className="t-small text-ink-2">Your browser can’t show the 3D view; the numbers and the cross-section still work.</p>
    <div className="mt-2 min-h-0 flex-1">{children}</div>
  </div>
);
