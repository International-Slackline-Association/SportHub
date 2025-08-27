export const mockAthleteProfile = {
  name: "Taylor St. Germain",
  age: 28,
  country: "Canada",
  website: "taylorstgermain.com",
  sponsors: "Rikuto Nakamura. Balance Community, Tim Hortons, Canadian Maple Syrup.",
  disciplines: [
    "SPEED_SHORT",
    "SPEED_HIGHLINE",
    "FREESTYLE_HIGHLINE",
  ],
  roles: ["ATHLETE", "JUDGE", "ORGANIZER"],
  socialMedia: {
    instagram: "https://instagram.com/taylor",
    youtube: "https://youtube.com/taylor",
    whatsapp: "https://whatsapp.com/taylor",
    twitch: "https://twitch.tv/taylor",
    tiktok: "https://tiktok.com/@taylor"
  }
}

export const mockAthleteContests = [
  {
    rank: 1,
    eventName: "Laax",
    contest: "Speed Highline - Male - Pro",
    discipline: "SPEED_HIGHLINE",
    points: 3000,
    contestSize: "Masters",
    dates: "02–04/07/2025"
  },
  {
    rank: 2,
    eventName: "Swiss Championships",
    contest: "Freestyle - Male - Pro",
    discipline: "FREESTYLE_HIGHLINE",
    points: 2500,
    contestSize: "Masters",
    dates: "12-15/06/2025"
  },
  {
    rank: 3,
    eventName: "Canadian Open",
    contest: "Speed Short - Male - Pro",
    discipline: "SPEED_SHORT",
    points: 2200,
    contestSize: "National",
    dates: "01-03/05/2025"
  },
  {
    rank: 4,
    eventName: "Mountain Festival",
    contest: "Speed Highline - Male - Pro",
    discipline: "SPEED_HIGHLINE",
    points: 1800,
    contestSize: "International",
    dates: "20-22/04/2025"
  },
  {
    rank: 5,
    eventName: "European Cup",
    contest: "Freestyle - Male - Pro",
    discipline: "FREESTYLE_HIGHLINE",
    points: 1500,
    contestSize: "Continental",
    dates: "10-12/03/2025"
  },
  {
    rank: 6,
    eventName: "Urban Challenge",
    contest: "Speed Short - Male - Pro",
    discipline: "SPEED_SHORT",
    points: 1200,
    contestSize: "International",
    dates: "25-27/02/2025"
  },
  {
    rank: 7,
    eventName: "Winter Games",
    contest: "Freestyle - Male - Pro",
    discipline: "FREESTYLE_HIGHLINE",
    points: 1000,
    contestSize: "National",
    dates: "15-17/01/2025"
  }
]

export const mockWorldRecords = [
  {
    record: "Longest highline walk",
    location: "Alps, Switzerland",
    date: "15/08/2024",
    value: "2.5km"
  },
  {
    record: "Fastest speed line crossing",
    location: "Yosemite, USA",
    date: "22/05/2024",
    value: "45 seconds"
  }
]

export const mockWorldFirsts = [
  {
    achievement: "First double backflip on highline",
    location: "Grand Canyon, USA",
    date: "10/04/2023"
  },
  {
    achievement: "First continuous 24-hour highline walk",
    location: "Norway Fjords",
    date: "05/07/2023"
  }
]

export type AthleteProfile = typeof mockAthleteProfile;
export type AthleteContest = typeof mockAthleteContests[0];
export type WorldRecord = typeof mockWorldRecords[0];
export type WorldFirst = typeof mockWorldFirsts[0];
