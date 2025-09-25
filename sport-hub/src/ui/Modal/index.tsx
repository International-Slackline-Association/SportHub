import React from "react";
import Button from "../Button";
import styles from "./styles.module.css";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  className = "" 
}: ModalProps) => {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={[styles.modal, className].filter(Boolean).join(" ")}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 id="modal-title" className={styles.modalTitle}>
            {title}
          </h2>
          <Button
            variant="icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M7.0575 6L9.525 3.5325C9.6675 3.3975 9.75 3.21 9.75 3C9.75 2.5875 9.4125 2.25 9 2.25C8.79 2.25 8.6025 2.3325 8.4675 2.4675L6 4.9425L3.5325 2.4675C3.3975 2.3325 3.21 2.25 3 2.25C2.5875 2.25 2.25 2.5875 2.25 3C2.25 3.21 2.3325 3.3975 2.4675 3.5325L4.9425 6L2.475 8.4675C2.3325 8.6025 2.25 8.79 2.25 9C2.25 9.4125 2.5875 9.75 3 9.75C3.21 9.75 3.3975 9.6675 3.5325 9.5325L6 7.0575L8.4675 9.525C8.6025 9.6675 8.79 9.75 9 9.75C9.4125 9.75 9.75 9.4125 9.75 9C9.75 8.79 9.6675 8.6025 9.5325 8.4675L7.0575 6Z" fill="#71717A"/>
            </svg>
          </Button>
        </div>
        
        <div className={styles.modalBody}>
          {children}
        </div>
        
        {actions && (
          <div className={styles.modalActions}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;