import { Option } from "@ui/Form";
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
  { value: "TRICKLINE", label: "Trickline" },
  { value: "TRICKLINE_AERIAL", label: "Trickline Aerial" },
  { value: "TRICKLINE_JIB_AND_STATIC", label: "Trickline Jib & Static" },
  { value: "TRICKLINE_TRANSFER", label: "Trickline Transfer" },
  { value: "SPEED", label: "Speed" },
  { value: "SPEED_SHORT", label: "Speedline Short" },
  { value: "SPEED_HIGHLINE", label: "Speedline Highline" },
  { value: "ENDURANCE", label: "Endurance" },
  { value: "BLIND", label: "Blind" },
  { value: "RIGGING", label: "Rigging" },
  { value: "FREESTYLE", label: "Freestyle" },
  { value: "WALKING", label: "Walking" },
  // ISA-Rankings numeric discipline codes (used in migrated records)
  { value: "2",  label: "Trickline" },
  { value: "12", label: "Freestyle Highline" },
];

export const ageCategoryOptions: Option[] = [
  { value: "ALL", label: "All" },
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
