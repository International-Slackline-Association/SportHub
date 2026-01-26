'use client';

import { useState, useRef } from 'react';
import Button, { ButtonVariant } from '@ui/Button';
import Modal from '@ui/Modal';
import UpdateUserForm from '@ui/UserForm/UpdateUserForm';
import { FormikProps } from 'formik';
import { UserFormValues } from '@ui/UserForm/types';
import { CreateUserForm } from '.';

interface UserManagementModalProps {
  action?: 'CREATE' | 'UPDATE';
  buttonVariant?: ButtonVariant;
  user?: User;
}

const UserManagementModal = ({ user, buttonVariant = "primary", action }: UserManagementModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormikProps<UserFormValues>>(null);

  const buttonLabel = action === 'CREATE' ? 'Register' : 'Edit';
  const modalTitle = action === 'CREATE' ? 'Add New User' : 'Edit User';

  const FormComponentProps = {
    formRef: formRef,
    onAfterSubmit: () => setIsModalOpen(false),
    showSubmitButton: false,
  }

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant={buttonVariant}
      >
        {buttonLabel}
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        formRef={formRef}
        showDefaultActions={true}
      >
        {action === 'CREATE' && <CreateUserForm {...FormComponentProps} />}
        {action === 'UPDATE' && <UpdateUserForm {...FormComponentProps} user={user} />}
      </Modal>
    </>
  );
}

export default UserManagementModal;
