import { CircleFlag } from 'react-circle-flags';
import { getCountryByCode } from '@utils/countries';

interface CountryProps {
  countryCode: string;
  height?: number;
  label?: string;
  width?: number;
}

export const Country = ({ countryCode, height = 22, label, width = 22 }: CountryProps) => {
  if (!countryCode || countryCode === 'N/A') {
    return <span>N/A</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <CircleFlag
        countryCode={countryCode.toLowerCase()}
        height={height}
        width={width}
      />
      <span>{label || getCountryByCode(countryCode.toLowerCase())?.name}</span>
    </div>
  );
};

export default Country;