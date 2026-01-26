import * as Yup from 'yup';

export interface UserFormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  isaId?: string;
};

export const userValidationSchema = Yup.object({
  id: Yup.string(),
  name: Yup.string().required(),
  surname: Yup.string().required(),
  gender: Yup.string().required('Please select a gender'),
  email: Yup.string().email('Invalid email').required(),
  country: Yup.string(),
  isaId: Yup.string(),
});

export const initialUserValues = {
  id: '',
  name: '',
  surname: '',
  gender: '',
  email: '',
  country: '',
  isaId: '',
};
