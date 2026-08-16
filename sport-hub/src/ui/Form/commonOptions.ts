import { COUNTRIES } from "@utils/countries"

export const countryCodeOptions: Option[] = COUNTRIES.map(({ name, code }) => ({
  label: name,
  value: code,
}));

export const userGenderOptions: Option[] = [
  { value: "MEN", label: "Male" },
  { value: "WOMEN", label: "Female" },
  { value: "OTHER", label: "Other" },
];

export const eventGenderOptions: Option[] = [
  { value: "MEN_ONLY", label: "Men" },
  { value: "WOMEN_ONLY", label: "Women" },
  { value: "MIXED", label: "Mixed" },
];

export const disciplineOptions: Option[] = [
  { value: "FREESTYLE_HIGHLINE", label: "Freestyle Highline" },
  { value: "TRICKLINE_AERIAL", label: "Trickline" },
  { value: "SPEED_SHORT", label: "Speedline Short" },
  { value: "SPEED_HIGHLINE", label: "Speed Highline" },
  { value: "RIGGING", label: "Rigging" },
];

export const ageCategoryOptions: Option[] = [
  { value: "ALL", label: "All Ages" },
  { value: "YOUTH", label: "Youth" },
  { value: "SENIOR", label: "Senior" },
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
