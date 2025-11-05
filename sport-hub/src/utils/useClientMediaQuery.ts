"use client"

import { useEffect, useState } from 'react'

const BREAKPOINT_SM = 640; // Standardized breakpoint: 40rem = 640px (large phones/tablets)
const isDesktopQuery = `(min-width: ${BREAKPOINT_SM}px)`;

// Hook to determine device type based on device width
export function useClientMediaQuery() {
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    // Ensure we're in the browser before using window
    if (typeof window !== 'undefined') {
      const isDesktopMediaQueryList = window.matchMedia(isDesktopQuery);

      const handleMatchChange = () => {
        setIsDesktop(isDesktopMediaQueryList.matches);
      };

      isDesktopMediaQueryList.addEventListener('change', handleMatchChange);
      setIsDesktop(isDesktopMediaQueryList.matches);

      return () => {
        isDesktopMediaQueryList.removeEventListener('change', handleMatchChange);
      };
    }
  }, []);

  return {
    isDesktop: isHydrated ? isDesktop : false,
    isMobile: isHydrated ? !isDesktop : true,
    isHydrated
  };
};
