import { Option } from "@ui/Form";
import { COUNTRIES } from "@utils/countries";

export const countryCodeOptions: Option[] = COUNTRIES.map(({ name, code }) => ({
  label: name,
  value: code,
}));

export const genderOptions: Option[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "NON_BINARY", label: "Non-Binary" },
  { value: "OTHER", label: "Other" },
];

export const disciplineOptions: Option[] = [
  { value: "FREESTYLE_HIGHLINE", label: "Freestyle Highline" },
  { value: "RIGGING", label: "Rigging" },
  { value: "SPEED_HIGHLINE", label: "Speed Highline" },
  { value: "SPEED_SHORT", label: "Speed Short" },
  { value: "TRICKLINE", label: "Trickline" },
];