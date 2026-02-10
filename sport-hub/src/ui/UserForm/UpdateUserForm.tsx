'use client';

import { Formik, Form, FormikHelpers, type FormikProps } from 'formik';
import { FormikSubmitButton } from '@ui/Form';
import { useState } from 'react';
import { UserFormValues, userValidationSchema } from './types';
import { updateUser } from './actions';
import UserForm from './UserFormFields';

interface UpdateUserFormProps {
  formRef?: React.RefObject<FormikProps<UserFormValues> | null>;
  onAfterSubmit?: () => void;
  showSubmitButton?: boolean;
  user?: User;
}

const UpdateUserForm = ({
  formRef,
  onAfterSubmit,
  showSubmitButton = true,
  user,
}: UpdateUserFormProps) => {
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  if (!user) {
    return <div>Missing user</div>;
  }

  const onSubmit = async (values: UserFormValues, { setSubmitting }: FormikHelpers<UserFormValues>) => {
    try {
      const formData = new FormData();
      formData.append('id', user.id);
      formData.append('name', values.name);
      formData.append('email', values.email);
      if (values.country) {
        formData.append('country', values.country);
      }

      await updateUser(formData);
      setApiSuccess(true);
      onAfterSubmit?.();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        return;
      }
      setApiError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      innerRef={formRef}
      initialValues={{
        // TODO Consolidate User type definitions
        id: user.userId || "",
        name: user.name,
        surname: user.name || '',
        email: user.email,
        country: user.country || '',
        isaId: user.id || '',
        gender: '',
      }}
      validateOnBlur
      validateOnChange={false}
      validationSchema={userValidationSchema}
      onSubmit={onSubmit}
    >
      {({ dirty }) => {
        return (
          <Form>
            <UserForm />
            {showSubmitButton && <FormikSubmitButton />}
            {(apiError && !dirty) && <div className="text-red-600 mt-2">{apiError}</div>}
            {(apiSuccess && !dirty) && <div className="text-green-600 mt-2">User created successfully!</div>}
          </Form>
        );
      }}
    </Formik>
  );
}
export default UpdateUserForm;
