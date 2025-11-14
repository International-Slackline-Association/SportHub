import * as Yup from 'yup';

// Combined form values (parent level)
export interface EventSubmissionFormValues {
  event: EventFormValues;
  // TODO: Add contests: ContestFormValues[];
}

/*******************************************************************************
 * Event Form Types and Validation
 ******************************************************************************/
export interface EventFormValues {
  // Assets
  avatarUrl?: string;
  youtubeVideo?: string;

  // General Information
  name: string;
  city: string;
  country: string;
  date: string;
  website: string;

  // Disciplines (checkboxes)
  disciplines: Discipline[];

  // Social Media
  socialMedia: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitch?: string;
    youtube?: string;
  }
}

// Helper: transform "YYYY-MM-DD" into a stable Date (treat as local/UTC as needed)
const dateTransform = (value: any, originalValue: any) => {
  if (typeof originalValue === 'string' && originalValue.trim() === '') return null
  // Append T00:00:00 to avoid timezone parsing surprises; adjust if you want UTC
  return new Date(originalValue + 'T00:00:00')
}

export const eventValidationSchema = Yup.object({
  // Assets
  avatarUrl: Yup.string()
    .url('Please enter a valid URL')
    .nullable(),
  youtubeVideo: Yup.string()
    .url('Please enter a valid YouTube URL')
    .nullable(),

  // General Info
  name: Yup.string()
    .required("Name is required")
    .min(3, 'Event name must be at least 3 characters'),
  city: Yup.string()
    .required("City is required")
    .min(2, 'City must be at least 2 characters'),
  country: Yup.string()
    .required("Country is required"),
  date: Yup.date()
    .transform(dateTransform)
    .typeError('Invalid date (expected YYYY-MM-DD)')
    .required("Date is required"),
  website: Yup.string()
    .url('Please enter a valid URL (e.g., https://example.com)')
    .nullable(),
  disciplines: Yup.array()
    .of(Yup.string())
    .min(1, 'Please select at least one discipline')
    .required('Please select at least one discipline'),
  // Social Media
  socialMedia: Yup.object().shape({
    facebook: Yup.string()
      .url('Please enter a valid Facebook URL')
      .nullable(),
    instagram: Yup.string()
      .matches(
        /^@?[\w](?!.*?\.{2})[\w.]{0,28}[\w]$/,
        'Please enter a valid Instagram handle'
      )
      .nullable(),
    tiktok: Yup.string()
      .matches(
        /^@?[\w](?!.*?\.{2})[\w.]{0,28}[\w]$/,
        'Please enter a valid TikTok handle'
      )
      .nullable(),
    twitch: Yup.string()
      .url('Please enter a valid Twitch URL')
      .nullable(),
    youtube: Yup.string()
      .url('Please enter a valid YouTube URL')
      .nullable(),
  }),
});

// Initial values for Event form
export const initialEventValues: EventFormValues = {
  name: '',
  city: '',
  country: '',
  date: '',
  website: '',
  disciplines: [],
  socialMedia: {}
};
