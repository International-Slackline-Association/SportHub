'use client';

import { Formik, Form, FormikHelpers, type FormikProps } from 'formik';
import { FormikSubmitButton } from '@ui/Form';
import { useState } from 'react';
import { initialUserValues, UserFormValues, userValidationSchema } from './types';
import { createUser } from './actions';
import { usePathname } from 'next/navigation';
import UserFormFields from './UserFormFields';

interface CreateUserFormProps {
  formRef?: React.RefObject<FormikProps<UserFormValues> | null>;
  onAfterSubmit?: () => void;
  showSubmitButton?: boolean;
}

export const CreateUserForm = ({
  formRef,
  onAfterSubmit,
  showSubmitButton = true,
}: CreateUserFormProps) => {
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const pathname = usePathname();

  const onSubmit = async (values: UserFormValues, { resetForm, setSubmitting }: FormikHelpers<UserFormValues>) => {
    try {
      await createUser(values, pathname);
      resetForm();
      setApiSuccess(true);
      onAfterSubmit?.();
    } catch (error: unknown) {
      setApiError(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      innerRef={formRef}
      initialValues={initialUserValues}
      validateOnBlur
      validateOnChange={false}
      validationSchema={userValidationSchema}
      onSubmit={onSubmit}
    >
      {({ dirty }) => {
        return (
          <Form>
            <UserFormFields />
            {showSubmitButton && <FormikSubmitButton />}
            {(apiError && !dirty) && <div className="text-red-600 mt-2">{apiError}</div>}
            {(apiSuccess && !dirty) && <div className="text-green-600 mt-2">User created successfully!</div>}
          </Form>
        );
      }}
    </Formik>
  );
}
export default CreateUserForm;
