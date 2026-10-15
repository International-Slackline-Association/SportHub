export const normalizeGender = (gender: number | string | null): Gender | undefined => {
  switch (String(gender)?.toUpperCase()) {
    case '1':
    case 'MEN':
    case 'MEN_ONLY':
    case 'MALE':
      return 'MEN';
    case '2':
    case 'WOMEN':
    case 'WOMEN_ONLY':
    case 'FEMALE':
      return 'WOMEN';
    case '0':
    case '3':
    case 'ALL':
    case 'MIXED':
    case 'OTHER':
      return 'ALL';
    default:
      return undefined;
  }
};
