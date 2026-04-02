"use client";

import { useState, useEffect, useCallback } from "react";

/** Breakpoints aligned with Tailwind defaults */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * Returns true when viewport width is below the given breakpoint.
 * Default breakpoint is `lg` (1024px) — the threshold where the
 * desktop sidebar becomes the mobile drawer.
 */
export function useIsMobile(breakpoint: Breakpoint = "lg") {
  const [isMobile, setIsMobile] = useState(false);

  const check = useCallback(() => {
    setIsMobile(window.innerWidth < BREAKPOINTS[breakpoint]);
  }, [breakpoint]);

  useEffect(() => {
    check();
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS[breakpoint] - 1}px)`);
    const handler = () => check();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint, check]);

  return isMobile;
}

/**
 * Returns the current active breakpoint name.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("xl");

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < BREAKPOINTS.sm) setBp("sm");
      else if (w < BREAKPOINTS.md) setBp("md");
      else if (w < BREAKPOINTS.lg) setBp("lg");
      else if (w < BREAKPOINTS.xl) setBp("xl");
      else setBp("2xl");
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return bp;
}
