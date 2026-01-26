import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';

export default function UserFormFields() {
  return (
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
        label="Email"
        placeholder="Enter email address"
        required
      />
      <FormikTextField
        id="name"
        label="Name"
        placeholder="Enter first name"
        required
      />
      <FormikTextField
        id="surname"
        label="Surname"
        placeholder="Enter last name"
        required
      />
      <FormikSelectField
        id="gender"
        label="Gender"
        options={userGenderOptions}
        placeholder="Select gender"
        required
      />
      <FormikSelectField
        id="country"
        label="Country"
        options={countryCodeOptions}
        placeholder="Select country"
        required
      />
    </div>
  );
}