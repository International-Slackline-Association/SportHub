"use client";

import { CopyIcon } from '@ui/Icons';
import { PropsWithChildren, useState } from "react";
import Button from "@ui/Button";

type ClipBoardButtonProps = PropsWithChildren<{
  /** Path or absolute URL to copy. Defaults to the current page URL. */
  url?: string;
}>;

export const ClipBoardButton = ({ children, url }: ClipBoardButtonProps) => {
  const [copySuccess, setCopySuccess] = useState('');

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url ? new URL(url, window.location.origin).href : window.location.href);
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
