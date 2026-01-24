'use client';

import { useState, useRef, useEffect } from 'react';
import { InfoIcon } from '@ui/Icons';
import { cn } from '@utils/cn';
import styles from './styles.module.css';

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip = ({
  content,
  position = 'top',
  className
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const triggerRect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let newPosition = position;

      // Check if tooltip would go off screen and adjust position
      if (position === 'top' && triggerRect.top - tooltipRect.height < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height > viewportHeight) {
        newPosition = 'top';
      } else if (position === 'left' && triggerRect.left - tooltipRect.width < 0) {
        newPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width > viewportWidth) {
        newPosition = 'left';
      }

      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  return (
    <div className={cn(styles.tooltipContainer, className)}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.tooltipTrigger}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? 'tooltip' : undefined}
      >
        <InfoIcon/>
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          id="tooltip"
          role="tooltip"
          className={cn(
            styles.tooltip,
            styles[`tooltip${actualPosition.charAt(0).toUpperCase() + actualPosition.slice(1)}`]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};