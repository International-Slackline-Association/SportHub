import * as Yup from 'yup';

// Combined form values (parent level)
export interface EventSubmissionFormValues {
  event: EventFormValues;
  contests: ContestFormValues[];
}


// Discipline options from the Figma design
export const disciplineOptions = [
  { value: 'freestyle-highline', label: 'Freestyle Highline' },
  { value: 'freestyle-trickline', label: 'Freestyle Trickline' },
  { value: 'speed-highline', label: 'Speed Highline' },
  { value: 'speed-short', label: 'Speed Short' },
  { value: 'rigging', label: 'Rigging' },
];

// Gender options for contests
export const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'mixed', label: 'Mixed' },
] as const;

// Age category options
export const ageCategoryOptions = [
  { value: 'junior-u17', label: 'Junior U17' },
  { value: 'professional-17-35', label: 'Professional 17-35' },
  { value: 'master-35+', label: 'Master 35+' },
] as const;

// Contest size options
export const contestSizeOptions = [
  { value: 'world-championship', label: 'World Championship' },
  { value: 'continental-championship', label: 'Continental Championship' },
  { value: 'national-championship', label: 'National Championship' },
  { value: 'international', label: 'International' },
  { value: 'national', label: 'National' },
  { value: 'regional', label: 'Regional' },
  { value: 'local', label: 'Local' },
] as const;

// Judging system options
export const judgingSystemOptions = [
  { value: 'isa-freestyle', label: 'ISA Freestyle' },
  { value: 'isa-speed', label: 'ISA Speed' },
  { value: 'custom', label: 'Custom' },
] as const;

/*******************************************************************************
 * Event Form Types and Validation
 ******************************************************************************/
export interface EventFormValues {
  // Assets
  avatarUrl?: string;
  youtubeVideo?: string;

  // General Information
  eventName: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  website: string;

  // Disciplines (checkboxes)
  disciplines: string[];

  // Social Media
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  twitch?: string;
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
  eventName: Yup.string()
    .required("Name is required")
    .min(3, 'Event name must be at least 3 characters'),
  city: Yup.string()
    .required("City is required")
    .min(2, 'City must be at least 2 characters'),
  country: Yup.string()
    .required("Country is required"),
  startDate: Yup.date()
    .required("Start date is required")
    .typeError('Please enter a valid date'),
  endDate: Yup.date()
    .required("End date is required")
    .min(Yup.ref('startDate'), 'End date must be after start date')
    .typeError('Please enter a valid date'),
  website: Yup.string()
    .url('Please enter a valid URL (e.g., https://example.com)')
    .nullable(),
  disciplines: Yup.array()
    .of(Yup.string())
    .min(1, 'Please select at least one discipline')
    .required('Please select at least one discipline'),
  // Social Media
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
});

// Initial values for Event form
export const initialEventValues: EventFormValues = {
  eventName: '',
  city: '',
  country: '',
  startDate: '',
  endDate: '',
  website: '',
  disciplines: [],
};


// Contest form values type
export interface ContestFormValues {
  id?: string; // For editing existing contests
  gender: string;
  discipline: string;
  ageCategory: string;
  judgingSystem: string;
  totalPrizeValue: string;
  contestSize: string;
}

// Initial values for Contest form
export const initialContestValues: ContestFormValues = {
  gender: '',
  discipline: '',
  ageCategory: '',
  judgingSystem: '',
  totalPrizeValue: '',
  contestSize: '',
};
