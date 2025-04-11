"use client"

import { useEffect, useState } from 'react'

const BREAKPOINT_SM = 640; // Tailwind's default "sm" breakpoint
const isDesktopQuery = `(min-width: ${BREAKPOINT_SM}px)`;

// Hook to determine device type based on device width
export function useClientMediaQuery() {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

  useEffect(() => {
    const isDesktopMediaQueryList = window.matchMedia(isDesktopQuery);

    const handleMatchChange = () => {
      setIsDesktop(isDesktopMediaQueryList.matches);
    };

    isDesktopMediaQueryList.addEventListener('change', handleMatchChange);
    setIsDesktop(isDesktopMediaQueryList.matches);

    return () => {
      isDesktopMediaQueryList.removeEventListener('change', handleMatchChange);
    }
  }, []);

  return {
    isDesktop,
    isMobile: !isDesktop
  };
};
