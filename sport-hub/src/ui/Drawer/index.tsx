import { ReactNode, useEffect } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';

interface DrawerProps {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  position?: DrawerPosition;
}

const Drawer = ({
  isOpen,
  onClose,
  position = 'left',
  children,
  className,
}: DrawerProps) => {
  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.drawerContainer}>
      <div className={styles.backdrop} onClick={onClose} />
      <div 
        className={cn(
          styles.drawer,
          styles[`drawer-${position}`],
          isOpen && styles.open,
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default Drawer;
