export const normalizeGender = (gender: number | string | null | undefined): string | undefined => {
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
    case 'ALL':
      return 'ALL';
    case '0':
    case '3':
    case 'MIXED':
    case 'OTHER':
      return 'MIXED';
    default:
      return undefined;
  }
};
