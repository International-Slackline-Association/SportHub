import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';

interface UserFormFieldsProps {
  isEditMode?: boolean;
}

export default function UserFormFields({ isEditMode = false }: UserFormFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      <FormikTextField
        id="id"
        label="User ID"
        name="id"
        placeholder={isEditMode ? undefined : "Auto-generated if empty"}
        disabled={isEditMode}
        title={isEditMode ? "User ID cannot be changed after creation" : undefined}
      />
      <FormikTextField
        id="isaId"
        label="ISA ID"
        name="isaId"
        placeholder="Optional"
      />
      <FormikTextField
        id="email"
        label="Email"
        name="email"
        placeholder="Enter email address"
        required
      />
      <FormikTextField
        id="name"
        label="Name"
        name="name"
        placeholder="Enter first name"
        required
      />
      <FormikTextField
        id="surname"
        label="Surname"
        name="surname"
        placeholder="Enter last name"
        required
      />
      <FormikSelectField
        id="gender"
        label="Gender"
        name="gender"
        options={userGenderOptions}
        placeholder="Select gender"
        required
      />
      <FormikSelectField
        id="country"
        label="Country"
        name="country"
        options={countryCodeOptions}
        placeholder="Select country"
        required
      />
      <FormikTextField
        id="city"
        label="City"
        name="city"
        placeholder="Enter city"
      />
      <FormikTextField
        id="birthdate"
        label="Birthdate"
        name="birthdate"
        placeholder="YYYY-MM-DD"
      />
    </div>
  );
}