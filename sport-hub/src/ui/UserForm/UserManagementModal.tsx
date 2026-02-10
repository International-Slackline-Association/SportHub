'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button, { ButtonVariant } from '@ui/Button';
import Modal from '@ui/Modal';
import UpdateUserForm from '@ui/UserForm/UpdateUserForm';
import { FormikProps } from 'formik';
import { UserFormValues } from '@ui/UserForm/types';
import { CreateUserForm } from '.';
import { useQueryClient } from '@tanstack/react-query';

interface UserManagementModalProps {
  action?: 'CREATE' | 'UPDATE';
  buttonSize?: "medium" | "small";
  buttonVariant?: ButtonVariant;
  user?: User;
}

const UserManagementModal = ({
  action,
  buttonSize,
  buttonVariant = "primary",
  user,
}: UserManagementModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormikProps<UserFormValues>>(null);
  const queryClient = useQueryClient();

  const buttonLabel = action === 'CREATE' ? 'Register' : 'Edit';
  const modalTitle = action === 'CREATE' ? 'Add New User' : 'Edit User';

  const FormComponentProps = {
    formRef: formRef,
    onAfterSubmit: () => {
      setIsModalOpen(false);
      // Invalidate and refetch users query to refresh autocomplete
      queryClient.invalidateQueries({
        queryKey: ['users'],
        refetchType: 'all' // This forces refetch even for disabled queries
      });
    },
    showSubmitButton: false,
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        size={buttonSize}
        variant={buttonVariant}
        type="button"
      >
        {buttonLabel}
      </Button>
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={modalTitle}
          formRef={formRef}
          showDefaultActions={true}
        >
          {action === 'CREATE' && <CreateUserForm {...FormComponentProps} />}
          {action === 'UPDATE' && <UpdateUserForm {...FormComponentProps} user={user} />}
        </Modal>,
        document.body
      )}
    </>
  );
}

export default UserManagementModal;
