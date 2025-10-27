'use client';

import { useState, useRef } from 'react';
import { FormikHelpers, type FormikProps } from 'formik';
import { updateUser } from './actions';
import Button from '@ui/Button';
import Modal from '@ui/Modal';
import UserForm from './UserForm';

interface User {
  createdAt: string;
  id: string;
  name: string;
  email: string;
  country?: string;
  totalPoints?: number;
  contestsParticipated?: number;
}

interface UserManagementClientProps {
  readonly user: User;
}

interface FormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  isaId?: string;
}

export default function UserManagementClient({ user }: UserManagementClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const formRef = useRef<FormikProps<FormValues>>(null);

  // Initial form values
  const initialValues = {
    id: user.id,
    name: user.name,
    surname: '',
    gender: 'male',
    email: user.email,
    country: user.country || '',
    isaId: '',
  };

  const handleFormSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    try {
      const formData = new FormData();
      formData.append('id', user.id);
      formData.append('name', values.name);
      formData.append('email', values.email);
      if (values.country) {
        formData.append('country', values.country);
      }

      await updateUser(formData);

      setIsModalOpen(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        setIsModalOpen(false);
        return;
      }
      console.error('Failed to update user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setIsModalOpen(true)}
      >
        Edit
      </Button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit User"
        formRef={formRef}
        showDefaultActions={true}
      >
        <UserForm
          initialValues={initialValues}
          onSubmit={handleFormSubmit}
          showSubmitButton={false}
          formRef={formRef}
        />
      </Modal>
    </>
  );
}