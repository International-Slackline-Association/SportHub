export interface Athlete {
  athleteId: string;
  name: string;
  surname: string;
  fullName?: string;
  country: string;
  gender: 'male' | 'female' | 'other';
  ageCategory: string;
  disciplines: Discipline[];
  points: number;
  profileImage?: string;
}

export const disciplineColors = {
  "FREESTYLE_HIGHLINE": { color: "#FFF0C6", textColor: "#DD6702" },
  "SPEED_HIGHLINE": { color: "#DCE7FD", textColor: "#3259E7" },
  "SPEED_SHORT": { color: "#D7F4E4", textColor: "#1B805F" },
  "TRICKLINE": { color: "#FFE0E0", textColor: "#EB0000" }
};

export const mockFeaturedAthletes: Athlete[] = [
  {
    athleteId: "laax-champion",
    name: "Friedi",
    surname: "Kühne",
    fullName: "Friedi Kühne",
    country: "Germany",
    gender: "male",
    ageCategory: "Open",
    disciplines: ["FREESTYLE_HIGHLINE"],
    points: 2800,
    profileImage: "/static/images/profiles/friedi-kuhne.jpg"
  },
  {
    athleteId: "vidal-st-germain",
    name: "Vidal",
    surname: "St. Germain",
    fullName: "Vidal St. Germain",
    country: "Brazil",
    gender: "male",
    ageCategory: "Open",
    disciplines: ["SPEED_SHORT", "SPEED_HIGHLINE", "FREESTYLE_HIGHLINE"],
    points: 2730,
    profileImage: "/static/images/profiles/vidal-st-germain.jpg"
  },
  {
    athleteId: "axel-st-germain",
    name: "Axel",
    surname: "St. Germain",
    fullName: "Axel St. Germain",
    country: "Italy",
    gender: "male",
    ageCategory: "Youth U18",
    disciplines: ["FREESTYLE_HIGHLINE"],
    points: 2650,
    profileImage: "/static/images/profiles/axel-st-germain.jpg"
  },
  {
    athleteId: "watson-st-germain",
    name: "Watson",
    surname: "St. Germain",
    fullName: "Watson St. Germain",
    country: "Brazil",
    gender: "male",
    ageCategory: "Open",
    disciplines: ["SPEED_SHORT", "SPEED_HIGHLINE", "FREESTYLE_HIGHLINE"],
    points: 2500,
    profileImage: "/static/images/profiles/watson-st-germain.jpg"
  }
];

export const mockRankings: Athlete[] = [
  {
    athleteId: "rikuto-nakamura",
    name: "Rikuto",
    surname: "Nakamura",
    fullName: "Rikuto Nakamura",
    country: "Japan",
    gender: "male",
    ageCategory: "Youth U16",
    disciplines: ["FREESTYLE_HIGHLINE", "SPEED_HIGHLINE"],
    points: 3000,
    profileImage: "/static/images/profiles/rikuto-nakamura.jpg"
  },
  ...mockFeaturedAthletes,
  {
    athleteId: "harry-clouder",
    name: "Harry",
    surname: "Clouder",
    fullName: "Harry Clouder",
    country: "United Kingdom",
    gender: "male",
    ageCategory: "Open",
    disciplines: ["TRICKLINE", "SPEED_SHORT"],
    points: 2450,
    profileImage: "/static/images/profiles/harry-clouder.jpg"
  },
  {
    athleteId: "julia-schmidt",
    name: "Julia",
    surname: "Schmidt",
    fullName: "Julia Schmidt",
    country: "Germany",
    gender: "female",
    ageCategory: "Open",
    disciplines: ["FREESTYLE_HIGHLINE"],
    points: 2340,
    profileImage: "/static/images/profiles/julia-schmidt.jpg"
  },
  {
    athleteId: "anna-merkel",
    name: "Anna",
    surname: "Merkel",
    fullName: "Anna Merkel",
    country: "Austria",
    gender: "female",
    ageCategory: "Open",
    disciplines: ["SPEED_HIGHLINE", "FREESTYLE_HIGHLINE"],
    points: 2250,
    profileImage: "/static/images/profiles/anna-merkel.jpg"
  },
  {
    athleteId: "thomas-walker",
    name: "Thomas",
    surname: "Walker",
    fullName: "Thomas Walker",
    country: "United States",
    gender: "male",
    ageCategory: "Youth U18",
    disciplines: ["TRICKLINE"],
    points: 2100,
    profileImage: "/static/images/profiles/thomas-walker.jpg"
  },
  {
    athleteId: "david-johnson",
    name: "David",
    surname: "Johnson",
    fullName: "David Johnson",
    country: "Canada",
    gender: "male",
    ageCategory: "Open",
    disciplines: ["SPEED_SHORT", "SPEED_HIGHLINE"],
    points: 2050,
    profileImage: "/static/images/profiles/david-johnson.jpg"
  },
  {
    athleteId: "zhang-wei",
    name: "Zhang",
    surname: "Wei",
    fullName: "Zhang Wei",
    country: "China",
    gender: "male",
    ageCategory: "Youth U16",
    disciplines: ["FREESTYLE_HIGHLINE"],
    points: 1980,
    profileImage: "/static/images/profiles/zhang-wei.jpg"
  }
];

export const filterOptions = {
  disciplines: ["FREESTYLE_HIGHLINE", "SPEED_HIGHLINE", "SPEED_SHORT", "TRICKLINE"],
  genders: ["male", "female"],
  years: ["2025", "2024", "2023"],
  ageCategories: ["Open", "Youth U18", "Youth U16"],
  countries: ["Japan", "Germany", "Brazil", "Italy", "United Kingdom", "Austria", "United States", "Canada", "China"]
};
