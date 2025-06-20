"use client"

import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind by default

/**
 * Hook to detect if the current device is mobile based on screen width.
 * Returns `true` if mobile, `false` if desktop, `undefined` during SSR.
 */
export function useIsMobile(): boolean | undefined {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check after component mounts
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up event listener on component unmount
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  return isMobile;
}
