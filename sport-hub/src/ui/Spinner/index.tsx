import React from 'react';
import styles from './styles.module.css';

interface SpinnerProps {
  className?: string;
  color?: 'primary' | 'white' | 'neutral';
  size?: 'small' | 'medium' | 'large';
}

const Spinner = ({
  size = 'medium',
  color = 'primary',
  className = ''
}: SpinnerProps) => {
  return (
    <div
      className={`${styles.spinner} ${styles[size]} ${styles[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className={styles.visuallyHidden}>Loading...</span>
    </div>
  );
};

export default Spinner;