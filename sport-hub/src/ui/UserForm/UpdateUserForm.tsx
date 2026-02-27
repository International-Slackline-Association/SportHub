'use client';

import { Formik, Form, FormikHelpers, type FormikProps } from 'formik';
import { FormikSubmitButton } from '@ui/Form';
import { useState } from 'react';
import { UserFormValues, userValidationSchema, UserData } from './types';
import { updateUser } from './actions';
import UserFormFields from './UserFormFields';

interface UpdateUserFormProps {
  formRef?: React.RefObject<FormikProps<UserFormValues> | null>;
  onAfterSubmit?: () => void;
  showSubmitButton?: boolean;
  user?: UserData;
  /** When provided, overrides the default server action (e.g. for CSR API calls) */
  onSubmit?: (values: UserFormValues, helpers: FormikHelpers<UserFormValues>) => Promise<void>;
}

const UpdateUserForm = ({
  formRef,
  onAfterSubmit,
  showSubmitButton = true,
  user,
  onSubmit: onSubmitOverride,
}: UpdateUserFormProps) => {
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  if (!user) {
    return <div>Missing user</div>;
  }

  const defaultSubmit = async (values: UserFormValues, { setSubmitting }: FormikHelpers<UserFormValues>) => {
    try {
      const formData = new FormData();
      formData.append('id', user.userId || user.id);
      formData.append('name', values.name);
      formData.append('surname', values.surname);
      formData.append('email', values.email);
      if (values.gender) formData.append('gender', values.gender);
      if (values.country) formData.append('country', values.country);
      if (values.city) formData.append('city', values.city);
      if (values.birthdate) formData.append('birthdate', values.birthdate);

      await updateUser(formData);
      setApiSuccess(true);
      onAfterSubmit?.();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
        onAfterSubmit?.();
        return;
      }
      setApiError(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = onSubmitOverride ?? defaultSubmit;

  return (
    <Formik
      innerRef={formRef}
      initialValues={{
        id: user.userId || user.id,
        name: user.name,
        surname: user.surname || '',
        email: user.email,
        gender: user.gender || '',
        country: user.country || '',
        city: user.city || '',
        birthdate: user.birthdate || '',
        isaId: user.isaUsersId || '',
      }}
      validateOnBlur
      validateOnChange={false}
      validationSchema={userValidationSchema}
      onSubmit={handleSubmit}
    >
      {({ dirty }) => (
        <Form>
          <UserFormFields isEditMode={true} />
          {showSubmitButton && <FormikSubmitButton />}
          {(apiError && !dirty) && <div className="text-red-600 mt-2">{apiError}</div>}
          {(apiSuccess && !dirty) && <div className="text-green-600 mt-2">User updated successfully!</div>}
        </Form>
      )}
    </Formik>
  );
}
export default UpdateUserForm;
