import * as Yup from 'yup';
import { Option } from '@ui/Form';

// Combined form values (parent level)
export interface EventSubmissionFormValues {
  event: EventFormValues;
  contests: ContestFormValues[];
}

/*******************************************************************************
 * Event Form Types and Validation
 ******************************************************************************/
export interface EventFormValues {
  // Assets
  profileUrl?: string;
  thumbnailUrl?: string;

  // General Information
  name: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
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
const dateTransform = (value: unknown, originalValue: unknown) => {
  if (typeof originalValue === 'string' && originalValue.trim() === '') return null
  // Append T00:00:00 to avoid timezone parsing surprises; adjust if you want UTC
  return new Date(originalValue + 'T00:00:00')
}

const URL_REGEX = /((https?):\/\/)?(www.)?[a-z0-9]+(\.[a-z]{2,}){1,3}(#?\/?[a-zA-Z0-9#]+)*\/?(\?[a-zA-Z0-9-_]+=[a-zA-Z0-9-%]+&?)?$/;
const SOCIAL_MEDIA_REGEX = /^@?[\w](?!.*?\.{2})[\w.]{0,28}[\w]$/;

export const eventValidationSchema = Yup.object({
  // Assets
  profileUrl: Yup.string()
    .nullable(),
  thumbnailUrl: Yup.string()
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
  startDate: Yup.date()
    .transform(dateTransform)
    .typeError('Invalid date (expected YYYY-MM-DD)')
    .required("Date is required"),
  endDate: Yup.date()
    .transform(dateTransform)
    .typeError('Invalid date (expected YYYY-MM-DD)')
    .required("Date is required"),
  website: Yup.string()
    .url('Please enter a valid URL (e.g., https://example.com)')
    .nullable(),
  disciplines: Yup.array()
    .of(Yup.string())
    .min(1, 'Please select at least one discipline')
    .required(),
  // Social Media
  socialMedia: Yup.object().shape({
    facebook: Yup.string()
      .matches(URL_REGEX, 'Please enter a valid URL')
      .nullable(),
    instagram: Yup.string()
      .matches(SOCIAL_MEDIA_REGEX, 'Please enter a valid Instagram handle')
      .nullable(),
    tiktok: Yup.string()
      .matches(SOCIAL_MEDIA_REGEX, 'Please enter a valid TikTok handle')
      .nullable(),
    twitch: Yup.string()
      .matches(URL_REGEX, 'Please enter a valid URL')
      .nullable(),
    youtube: Yup.string()
      .matches(URL_REGEX, 'Please enter a valid URL')
      .nullable(),
  }),
});

// Initial values for Event form
export const initialEventValues: EventFormValues = {
  name: '',
  city: '',
  country: '',
  startDate: '',
  endDate: '',
  website: '',
  disciplines: [],
  socialMedia: {}
};

/*******************************************************************************
 * Contest Form Types and Validation
 ******************************************************************************/
export interface ContestResultEntry {
  rank: number;
  id: string;
  name?: string;
  isaPoints: number;
  stats: string;
}

export interface ContestFormValues {
  startDate?: string;
  endDate?: string;
  discipline: Discipline;
  gender: Gender;
  ageCategory: AgeCategory;
  judgingSystem: JudgingSystem;
  contestSize: ContestSize;
  totalPrizeValue?: number;
  judges?: {
    id: string;
    name?: string;
  }[];
  results?: ContestResultEntry[];
}

export const contestValidationSchema = Yup.object({
  startDate: Yup.date()
    .transform(dateTransform)
    .typeError('Invalid date (expected YYYY-MM-DD)'),
  endDate: Yup.date()
    .transform(dateTransform)
    .typeError('Invalid date (expected YYYY-MM-DD)'),
  gender: Yup.string()
    .required('Gender category is required'),
  discipline: Yup.string()
    .required('Discipline is required'),
  judgingSystem: Yup.string(),
  ageCategory: Yup.string()
    .required('Age category is required'),
  totalPrizeValue: Yup.number()
    .min(0, 'Prize value must be positive')
    .nullable(),
  contestSize: Yup.string()
    .required('Contest size is required'),
  judges: Yup.array()
    .test(
      'is-unique-judges',
      (context) => {
        const allIds = context.value.map((judge: Option) => judge.value.trim().toLowerCase());
        const duplicateIds = allIds.filter((id: string, index: number) => allIds.indexOf(id) !== index);
        return `Duplicate judges found in the list: ${duplicateIds.join(', ')}`;
      },
      (value) => {
        if (!value || value.length === 0) return true;
        const allIds = value.map(judge => judge.value?.trim().toLowerCase());
        const uniqueIds = new Set(allIds);
        return allIds.length === uniqueIds.size;
      }
    )
    .min(1, 'Please add at least one judge'),
  results: Yup.array()
    .of(
      Yup.object().shape({
        rank: Yup.number()
          .min(1, 'Rank must be at least 1')
          .required('Rank is required'),
        // Not required because we may have unregistered participants
        id: Yup.string()
          .trim(),
        name: Yup.string()
          .trim()
          .min(1, 'Please enter a name')
          .nullable(),
        isaPoints: Yup.number()
          .min(0, 'Points must be positive')
          .required('ISA Points are required'),
        stats: Yup.string()
          .trim()
          .nullable(),
      })
    )
    .min(1, 'Please add at least one result entry'),
});

export const initialContestValues: ContestFormValues = {
  gender: '' as Gender,
  discipline: '' as Discipline,
  judgingSystem: '' as JudgingSystem,
  ageCategory: '' as AgeCategory,
  totalPrizeValue: undefined,
  contestSize: '' as ContestSize,
};

/*******************************************************************************
 * Combined Validation Schema
 ******************************************************************************/
export const eventSubmissionValidationSchema = Yup.object({
  event: eventValidationSchema,
  contests: Yup.array()
    .of(contestValidationSchema),
});
