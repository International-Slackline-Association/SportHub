'use client';

import { Formik, Form, FormikHelpers, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { createUser } from './actions';
import { FormikSelectField, FormikSubmitButton, FormikTextField, countryCodeOptions, genderOptions } from '@ui/Form';
import { useState } from 'react';

interface Form {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  isaId?: string;
};

const validationSchema = Yup.object({
  id: Yup.string(),
  name: Yup.string().required(),
  surname: Yup.string().required(),
  gender: Yup.string().required('Please select a gender'),
  email: Yup.string().email('Invalid email').required(),
  country: Yup.string(),
  isaId: Yup.string(),
});

const defaultValues = {
  id: '',
  name: '',
  surname: '',
  gender: '',
  email: '',
  country: '',
  isaId: '',
};

interface UserFormProps {
  initialValues?: Form;
  onSubmit?: (values: Form, helpers: FormikHelpers<Form>) => Promise<void>;
  showSubmitButton?: boolean;
  formRef?: React.RefObject<FormikProps<Form> | null>;
}

export default function UserForm({
  initialValues,
  onSubmit,
  showSubmitButton = true,
  formRef
}: UserFormProps) {
  const [apiSuccess, setApiSuccess] = useState(false);
  const [apiError, setApiError] = useState("");

  const defaultSubmitHandler = async (values: Form, { resetForm, setSubmitting }: FormikHelpers<Form>) => {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    try {
      await createUser(formData);
      resetForm();
      setApiSuccess(true);
    } catch (error: unknown) {
      setSubmitting(false);
      setApiError(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormSubmit = onSubmit || defaultSubmitHandler;

  return (
    <Formik
      innerRef={formRef}
      defaultValues={defaultValues}
      initialValues={initialValues || defaultValues}
      validateOnBlur
      validateOnChange={false}
      validationSchema={validationSchema}
      onSubmit={handleFormSubmit}
    >
      {({ dirty }) => {
        return (
        <Form>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <FormikTextField
              id="id"
              label="User ID"
              placeholder="Auto-generated if empty"
            />
            <FormikTextField
              id="isaId"
              label="ISA ID"
              placeholder="Optional"
            />
            <FormikTextField
              id="email"
              placeholder="Enter email address"
            />
            <FormikTextField
              id="name"
              placeholder="Enter first name"
            />
            <FormikTextField
              id="surname"
              placeholder="Enter last name"
            />
            <FormikSelectField
              id="gender"
              options={genderOptions}
              placeholder="Select gender"
            />
            <FormikSelectField
              id="country"
              options={countryCodeOptions}
              placeholder="Select country"
            />
          </div>
          {showSubmitButton && <FormikSubmitButton />}
          {(apiError && !dirty) && <div className="text-red-600 mt-2">{apiError}</div>}
          {(apiSuccess && !dirty) && <div className="text-green-600 mt-2">User created successfully!</div>}
        </Form>
        );
      }}
    </Formik>
  );
}