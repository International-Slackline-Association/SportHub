import * as Yup from 'yup';

export interface UserFormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  city?: string;
  birthdate?: string;
  isaId?: string;
};

export const userValidationSchema = Yup.object({
  id: Yup.string(),
  name: Yup.string().required(),
  surname: Yup.string().required(),
  gender: Yup.string().required('Please select a gender'),
  email: Yup.string().email('Invalid email').required(),
  country: Yup.string(),
  city: Yup.string(),
  birthdate: Yup.string(),
  isaId: Yup.string(),
});

export const initialUserValues = {
  id: '',
  name: '',
  surname: '',
  gender: '',
  email: '',
  country: '',
  city: '',
  birthdate: '',
  isaId: '',
};

/** Shape of an existing user record passed to UpdateUserForm / UserManagementModal */
export interface UserData {
  id: string;
  userId?: string;
  name: string;
  surname?: string;
  email: string;
  gender?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  isaUsersId?: string;
  role?: string;
  userSubTypes?: string[];
  primarySubType?: string;
}
