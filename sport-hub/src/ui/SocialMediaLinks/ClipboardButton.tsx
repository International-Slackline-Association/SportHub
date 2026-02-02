"use client";

import { CopyIcon } from '@ui/Icons';
import { PropsWithChildren, useState } from "react";
import Button from "@ui/Button";

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
    <Button onClick={copyToClipboard} variant="secondary">
      <CopyIcon />&nbsp;{copySuccess || children}
    </Button>
  );
};

export default ClipBoardButton;
