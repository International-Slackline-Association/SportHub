import { Option } from "@ui/Form";
import { COUNTRIES } from "@utils/countries"

export const countryCodeOptions: Option[] = COUNTRIES.map(({ name, code }) => ({
  label: name,
  value: code,
}));

export const userGenderOptions: Option[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "NON_BINARY", label: "Non-Binary" },
  { value: "OTHER", label: "Other" },
];

export const eventGenderOptions: Option[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export const disciplineOptions: Option[] = [
  { value: "FREESTYLE_HIGHLINE", label: "Freestyle Highline" },
  { value: "RIGGING", label: "Rigging" },
  { value: "SPEED_HIGHLINE", label: "Speed Highline" },
  { value: "SPEED_SHORT", label: "Speed Short" },
  { value: "TRICKLINE", label: "Trickline" },
];

export const ageCategoryOptions: Option[] = [
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "AMATEUR", label: "Amateur" },
  { value: "SENIOR", label: "Senior" },
  { value: "YOUTH_U16", label: "Youth (U16)" },
  { value: "YOUTH_U14", label: "Youth (U14)" },
];

export const judgingSystemOptions: Option[] = [
  { value: "BCS_SPEEDLINE_SYSTEM", label: "BCS Speedline System" },
  { value: "LAAX_SYSTEM", label: "Laax System" },
  { value: "TRANSALP_SPEEDLINE_SYSTEM", label: "Transalp Speedline System" },
  { value: "RIGGING_MASTERS", label: "Rigging Masters" },
];

export const contestSizeOptions: Option[] = [
  { value: "CHALLENGE", label: "Challenge" },
  { value: "OPEN", label: "Open" },
  { value: "GRAND_SLAM", label: "Grand Slam" },
  { value: "MASTERS", label: "Masters" },
  { value: "WORLD_CUP", label: "World Cup" },
  { value: "WORLD_CHAMPIONSHIP", label: "World Championship" },
];
