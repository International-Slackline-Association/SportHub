

import { auth, sheets } from '@googleapis/sheets';

const SPREADSHEET_ID = process.env.ISA_CERTIFICATES_SPREADSHEET_ID!;

const authClient = new auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const WORLD_RECORDS_SHEET = 'World Records';
const WORLD_FIRSTS_SHEET  = 'World Firsts';

export interface WorldRecordRow {
  lineType: string;     // e.g. "Highline", "Trickline"
  recordType: string;   // e.g. "Longest", "Highest"
  specs: string;
  name: string;
  country: string;
  gender: Gender;       // mapped from "category" column
  eventName: string;    // competition / location where set
  date: string;
  athleteEmail: string; // "ISA Email" column — used to resolve SportHub userId
}

const toGender = (raw: string): Gender => {
  switch (raw?.toLowerCase().trim()) {
    case 'men': case 'male': case 'm': return 'MEN';
    case 'women': case 'female': case 'f': case 'w': return 'WOMEN';
    case 'mixed': case 'all': return 'ALL';
    default: return 'OTHER';
  }
};

const toFormattedDate = (raw: string): string => {
  if (!raw) return '';
  // DD/MM/YYYY or DD.MM.YYYY — normalise dots to slashes and return
  if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(raw)) return raw.replace(/\./g, '/');
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
};

/** Parse DD/MM/YYYY (or DD.MM.YYYY after normalisation) to a comparable timestamp. */
const parseDateForSort = (formatted: string): number => {
  const m = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return 0;
  return new Date(`${m[3]}-${m[2]}-${m[1]}`).getTime();
};

export interface WorldFirstRow {
  description: string;  // "description of world first"
  specs: string;
  name: string;
  gender: Gender;       // mapped from "category" column
  date: string;
  country: string;      // "country of athlete"
  typeOfFirst: string;  // "type of first"
  lineType: string;     // "type of line"
  athleteEmail: string; // "ISA Email" column — used to resolve SportHub userId
}

export const getWorldFirstsSheet = async (): Promise<WorldFirstRow[]> => {
  const client = sheets({ version: 'v4', auth: authClient });

  const response = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: WORLD_FIRSTS_SHEET,
  });

  const rows = response.data.values ?? [];
  if (rows.length < 2) return [];

  const [headers, ...dataRows] = rows;

  const idx = (name: string) =>
    headers.findIndex((h: string) => h?.toLowerCase().trim() === name.toLowerCase());

  const descriptionIdx  = idx('description of world first');
  const specsIdx        = idx('specs');
  const nameIdx         = idx('name');
  const genderIdx       = idx('category');
  const dateIdx         = idx('date');
  const countryIdx      = idx('country of athlete') !== -1 ? idx('country of athlete') : idx('country');
  const typeOfFirstIdx  = idx('type of first');
  const lineTypeIdx     = idx('type of line') !== -1 ? idx('type of line') : idx('line type');
  const emailIdx        = idx('isa email') !== -1 ? idx('isa email') : idx('email');

  const result = dataRows
    .filter((row: string[]) => row.some(cell => cell?.trim()))
    .map((row: string[]): WorldFirstRow => ({
      description:  row[descriptionIdx]  ?? '',
      specs:        row[specsIdx]        ?? '',
      name:         row[nameIdx]         ?? '',
      gender:       toGender(row[genderIdx] ?? ''),
      date:         toFormattedDate(row[dateIdx] ?? ''),
      country:      row[countryIdx]      ?? '',
      typeOfFirst:  row[typeOfFirstIdx]  ?? '',
      lineType:     row[lineTypeIdx]     ?? '',
      athleteEmail: (row[emailIdx] ?? '').toLowerCase().trim(),
    }))
    .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date)); // newest first

  return result;
};

export const getWorldRecordsSheet = async (): Promise<WorldRecordRow[]> => {
  const client = sheets({ version: 'v4', auth: authClient });

  const response = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: WORLD_RECORDS_SHEET,
  });

  const rows = response.data.values ?? [];
  if (rows.length < 2) return [];

  const [headers, ...dataRows] = rows;

  const idx = (name: string) =>
    headers.findIndex((h: string) => h?.toLowerCase().trim() === name.toLowerCase());

  const lineTypeIdx    = idx('line type') !== -1 ? idx('line type') : idx('type of line');
  const recordTypeIdx  = idx('record type');
  const specsIdx       = idx('specs');
  const nameIdx        = idx('name');
  const countryIdx     = idx('country of athlete') !== -1 ? idx('country of athlete') : idx('country');
  const genderIdx      = idx('category');
  const eventNameIdx   = idx('event name') !== -1 ? idx('event name') : idx('event');
  const dateIdx        = idx('date');
  const emailIdx       = idx('isa email') !== -1 ? idx('isa email') : idx('email');

  return dataRows
    .filter((row: string[]) => row.some(cell => cell?.trim()))
    .map((row: string[]): WorldRecordRow => ({
      lineType:     row[lineTypeIdx]   ?? '',
      recordType:   row[recordTypeIdx] ?? '',
      specs:        row[specsIdx]      ?? '',
      name:         row[nameIdx]       ?? '',
      country:      row[countryIdx]    ?? '',
      gender:       toGender(row[genderIdx] ?? ''),
      eventName:    row[eventNameIdx]  ?? '',
      date:         toFormattedDate(row[dateIdx] ?? ''),
      athleteEmail: (row[emailIdx] ?? '').toLowerCase().trim(),
    }))
    .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date)); // newest first
};