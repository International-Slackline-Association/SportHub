// Google Sheet ids. Kept out of consts.tsx because that file imports UI components (CSS),
// which the tsx-run import scripts can't load.

/** "World Records" sheet (tabs "Categories" and "Data"): source of record categories and records. */
export const WORLD_RECORDS_SPREADSHEET_ID = '17kh4lhnP4bCMJOCp8A6zRCq-rxIkCD2hxiYdry38C5s';

/** ISA certificates sheet (tabs "World Records", "World Firsts"): source of firsts and the legacy records list. */
export const CERTIFICATES_AND_FIRSTS_SPREADSHEET_ID = '1WO8RDDn6WKTmZQX4YK9xNwWfh0-eciIX0fdSvsgNRsA';
