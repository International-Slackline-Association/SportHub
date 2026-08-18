'use client';

import { useState, useRef, useEffect } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import { updateProfile } from '../actions';
import { COUNTRIES, getCountryByName } from '@utils/countries';
import { CircleFlag } from 'react-circle-flags';
import { FormikTextField, LinkFieldArray } from '@ui/Form';
import Button from '@ui/Button';

interface CountryDropdownProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

function CountryDropdown({ value, onChange, disabled }: CountryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCountry = COUNTRIES.find(c => c.code === value);
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2">
          {selectedCountry ? (
            <>
              <CircleFlag countryCode={selectedCountry.code} height={22} width={22} />
              <span className="text-sm">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-500">Select a country</span>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search countries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-100"
            >
              Clear selection
            </button>
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => {
                  onChange(country.code);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 ${
                  country.code === value ? 'bg-blue-50' : ''
                }`}
              >
                <CircleFlag countryCode={country.code} height={22} width={22} />
                <span>{country.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ProfileEditFormValues {
  name: string;
  surname?: string;
  email: string;
  countryCode: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  links: string[];
}

interface ProfileEditFormProps {
  userId: string;
  initialData: {
    name: string;
    surname?: string;
    email: string;
    country?: string;
    city?: string;
    birthdate?: string;
    gender?: string;
    links?: string[];
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export default function ProfileEditForm({
  userId,
  initialData,
  onCancel,
  onSuccess,
}: ProfileEditFormProps) {
  // Find country code from name if provided
  const initialCountry = initialData.country
    ? getCountryByName(initialData.country)
    : undefined;

  const initialValues: ProfileEditFormValues = {
    name: initialData.name || '',
    surname: initialData.surname || '',
    email: initialData.email || '',
    countryCode: initialCountry?.code || '',
    city: initialData.city || '',
    birthdate: initialData.birthdate || '',
    gender: initialData.gender || '',
    links: initialData.links || [],
  };

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    values: ProfileEditFormValues,
    { setSubmitting }: FormikHelpers<ProfileEditFormValues>
  ) => {
    setError(null);

    try {
      const selectedCountry = COUNTRIES.find(c => c.code === values.countryCode);
      const cleanedLinks = values.links.map((link) => link.trim()).filter(Boolean);

      const result = await updateProfile(userId, {
        name: values.name.trim(),
        surname: values.surname?.trim() || undefined,
        email: values.email.trim(),
        country: selectedCountry?.name || undefined,
        city: values.city?.trim() || undefined,
        birthdate: values.birthdate || undefined,
        gender: values.gender || undefined,
        links: cleanedLinks.length ? cleanedLinks : undefined,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ values, setFieldValue, isSubmitting }) => (
        <Form className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <FormikTextField
            id="name"
            name="name"
            label="Name"
            required
          />
          <FormikTextField
            id="surname"
            name="surname"
            label="Surname"
          />
          <div>
            <FormikTextField
              id="email"
              name="email"
              label="Email"
              type="email"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Note: Changing email may require re-authentication
            </p>
          </div>

          <div>
            <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <CountryDropdown
              value={values.countryCode}
              onChange={(code) => setFieldValue('countryCode', code)}
              disabled={isSubmitting}
            />
          </div>

          <FormikTextField
            id="city"
            name="city"
            label="City"
          />
          <FormikTextField
            id="birthdate"
            name="birthdate"
            label="Birthdate"
            type="date"
          />

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={values.gender}
              onChange={(event) => setFieldValue('gender', event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <fieldset className="border border-gray-200 rounded-md p-4 space-y-4">
            <legend className="text-sm font-medium text-gray-700 px-1">Links</legend>
            <LinkFieldArray formKey="links" />
          </fieldset>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
