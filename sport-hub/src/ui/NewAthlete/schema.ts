import * as Yup from 'yup';
import type { PendingUserData } from 'src/app/events/submit/types';

const REQUIRED = 'Required';

/** A person without a SportHub profile yet; the profile is created on approval. */
export const pendingUserSchema = Yup.object({
  name: Yup.string().trim().required(REQUIRED),
  surname: Yup.string().trim().required(REQUIRED),
  email: Yup.string().trim().email('Enter a valid email').required(REQUIRED),
  gender: Yup.string().required(REQUIRED),
});

/** New-person details prefilled from the name typed into the search field. */
export const emptyPendingUser = (typedName: string): PendingUserData => {
  const parts = typedName.trim().split(/\s+/);
  return { name: parts[0] ?? '', surname: parts.slice(1).join(' '), email: '', gender: '', country: '', city: '', birthdate: '' };
};
