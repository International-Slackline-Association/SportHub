"use client";

import { PropsWithChildren, useState } from "react";
import styles from './styles.module.css'

export const ClipBoardButton = ({ children }: PropsWithChildren) => {
  const [copySuccess, setCopySuccess] = useState('');
     
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch {
      setCopySuccess('Failed to copy');
    }
  };
  
  return (
    <button onClick={copyToClipboard} className={styles.copyLink}>
      <span>{copySuccess || children}</span>
    </button>
  );
};

export default ClipBoardButton;
