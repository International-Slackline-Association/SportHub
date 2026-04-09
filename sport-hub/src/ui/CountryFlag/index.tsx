"use client";

import { CircleFlag } from 'react-circle-flags';
import { COUNTRIES, getIocCode, getIso2FromIoc } from '@utils/countries';

/**
 * Resolve any country string (full name, IOC code, or ISO2 code) to an ISO2 code.
 */
export function resolveIso2(countryStr: string): string | null {
  if (!countryStr) return null;

  // Full name match  e.g. "France"
  const byName = COUNTRIES.find(c => c.name.toLowerCase() === countryStr.toLowerCase());
  if (byName) return byName.code;

  // IOC code  e.g. "FRA"
  const fromIoc = getIso2FromIoc(countryStr);
  if (fromIoc && fromIoc !== countryStr.toLowerCase()) return fromIoc;

  // Direct ISO2  e.g. "fr"
  const byCode = COUNTRIES.find(c => c.code.toLowerCase() === countryStr.toLowerCase());
  if (byCode) return byCode.code;

  // Name → IOC → ISO2 fallback
  const iocCode = getIocCode(countryStr);
  if (iocCode && iocCode !== 'N/A') {
    const iso2 = getIso2FromIoc(iocCode);
    if (iso2) return iso2;
  }

  return null;
}

/**
 * Displays a circle flag + country name.
 * Accepts any country string format: full name, IOC code, or ISO2 code.
 */
export const CountryFlag = ({
  country,
  defaultValue = 'N/A',
}: {
  country: string;
  defaultValue?: string;
}) => {
  if (!country) return <span className="text-gray-500">{defaultValue}</span>;

  const iso2 = resolveIso2(country);
  if (!iso2) return <span className="text-sm text-gray-600">{country}</span>;

  const countryName = COUNTRIES.find(c => c.code === iso2)?.name ?? country;

  return (
    <div className="flex items-center gap-2" title={countryName}>
      <CircleFlag countryCode={iso2} height={22} width={22} />
      <span className="text-sm text-gray-600">{countryName}</span>
    </div>
  );
};

/**
 * Displays a circle flag + IOC code label.
 * Accepts an IOC code directly (e.g. "FRA"). Used in rankings.
 */
export const CountryFlagFromIoc = ({
  iocCode,
  defaultValue = 'N/A',
}: {
  iocCode: string;
  defaultValue?: string;
}) => {
  if (!iocCode || iocCode === 'N/A') {
    return <span className="text-gray-500">{defaultValue}</span>;
  }

  const iso2 = getIso2FromIoc(iocCode);

  return (
    <div className="flex items-center gap-2" title={iocCode}>
      <CircleFlag countryCode={iso2} height={22} width={22} />
      <span className="text-sm text-gray-600">{iocCode}</span>
    </div>
  );
};
