export type HeroImage = {
  src: string;
  alt: string;
  caption?: string;
  blurredBackground?: boolean;
  backgroundZoom?: number;
  objectPosition?: string;
};

const S3_BASE_URL = 'https://s3.eu-central-1.amazonaws.com/images.isa-rankings.org/public/sporthub/slackline-photos';
export const S3_IMAGES: Record<string, HeroImage[]> = {
  EVENTS: [
    {
      src: `${S3_BASE_URL}/organizers-laax2024-marcial-08.jpg`,
      alt: 'Event organizers at Laax 2024'
    },
    {
      src: `${S3_BASE_URL}/organizers-laax2024-jonas-05.jpg`,
      alt: 'Event organization scene at Laax 2024',
      objectPosition: 'center 60%',
    },
    {
      src: `${S3_BASE_URL}/organizers-laax2024-jonas-01.jpg`,
      alt: 'Event setup at Laax 2024',
      objectPosition: 'center 30%',
    },
    {
      src: `${S3_BASE_URL}/celebrations-podium-03.jpg`,
      alt: 'Podium celebration at an event'
    },
  ],
  RANKINGS: [
    {
      src: `${S3_BASE_URL}/judging-04.jpg`,
      alt: 'Judges reviewing an athlete performance',
      objectPosition: 'center 25%',
    },
    {
      src: `${S3_BASE_URL}/judging-03.jpg`,
      alt: 'Judging panel in action'
    },
    {
      src: `${S3_BASE_URL}/celebrations-podium-laax2024-jonas-14.jpg`,
      alt: 'Athletes celebrating on the podium'
    },
    {
      src: `${S3_BASE_URL}/celebrations-podium-12.jpg`,
      alt: 'Podium celebration with athletes'
    },
    {
      src: `${S3_BASE_URL}/celebrations-podium-02.jpg`,
      alt: 'Competition podium moment'
    },
  ],
  JUDGING: [
    {
      src: `${S3_BASE_URL}/judging-laax2024-marcial-13.jpg`,
      alt: 'Judges scoring performances at Laax 2024'
    },
    {
      src: `${S3_BASE_URL}/judging-19.jpg`,
      alt: 'Judging team discussing scores'
    },
    {
      src: `${S3_BASE_URL}/judging-15.jpg`,
      alt: 'Score sheets and judging panel'
    },
    {
      src: `${S3_BASE_URL}/judging-06.jpg`,
      alt: 'Judges evaluating a run'
    },
    {
      src: `${S3_BASE_URL}/judging-02.JPG`,
      alt: 'Judging officials at competition'
    },
  ],
  FREESTYLE_HIGHLINE: [
    {
      src: `${S3_BASE_URL}/freestyle-highline-laax2024-marcial-19.jpg`,
      alt: 'Freestyle highline athlete at Laax 2024',
      objectPosition: 'center 40%',
    },
    {
      src: `${S3_BASE_URL}/freestyle-highline-laax2024-jonas-16.jpg`,
      alt: 'Highline freestyle trick over alpine terrain',
      blurredBackground: true,
    },
    {
      src: `${S3_BASE_URL}/freestyle-highline-laax2024-jonas-14.jpg`,
      alt: 'Freestyle highline maneuver in competition',
      blurredBackground: true,
    },
    {
      src: `${S3_BASE_URL}/freestyle-highline-10.jpg`,
      alt: 'Athlete performing freestyle highline move',
      objectPosition: 'center 30%',
    },
    {
      src: `${S3_BASE_URL}/freestyle-highline-09.jpg`,
      alt: 'Freestyle highline performance',
      objectPosition: 'center 25%',
    },
  ],
  TRICKLINE: [
    {
      src: `${S3_BASE_URL}/jib-static-trick-07.jpg`,
      alt: 'Trickline athlete performing a static trick',
      objectPosition: 'center 90%',
    },
    {
      src: `${S3_BASE_URL}/event-audience-03.jpg`,
      alt: 'Audience watching trickline competition',
      objectPosition: 'center 30%',
    },
    {
      src: `${S3_BASE_URL}/jib-static-trick-03.jpg`,
      alt: 'Jib and static trickline action',
      blurredBackground: true,
    },
    {
      src: `${S3_BASE_URL}/jib-static-trick-06.jpg`,
      alt: 'Trickline athlete mid-combo'
    },
  ],
  SPEED_HIGHLINE: [
    {
      src: `${S3_BASE_URL}/speed-highline-04.jpg`,
      alt: 'Speed highline race moment',
      objectPosition: 'center 45%',
    },
    {
      src: `${S3_BASE_URL}/speed-highline-05.jpg`,
      alt: 'Athlete sprinting on a highline',
      objectPosition: 'center 30%',
    },
    {
      src: `${S3_BASE_URL}/speed-highline-01.JPG`,
      alt: 'Speed highline competition'
    },
    {
      src: `${S3_BASE_URL}/speed-highline-11.jpg`,
      alt: 'Highline speed event action shot'
    },
  ],
  SPEED_SHORT: [
    {
      src: `${S3_BASE_URL}/speedline-sprint-05.jpg`,
      alt: 'Speedline short sprint competition'
    },
    {
      src: `${S3_BASE_URL}/speedline-sprint-02.jpg`,
      alt: 'Athlete sprinting on short speedline'
    },
    {
      src: `${S3_BASE_URL}/speedline-sprint-04.jpg`,
      alt: 'Short speedline race in progress'
    },
    {
      src: `${S3_BASE_URL}/speedline-sprint-07.JPG`,
      alt: 'Competitors on short speedline'
    },
  ],
  RIGGING: [
    {
      src: `${S3_BASE_URL}/world-records-05.JPG`,
      alt: 'Rigging setup for a highline challenge',
      objectPosition: 'center 65%',
    },
    {
      src: `${S3_BASE_URL}/world-records-07.JPG`,
      alt: 'Technical rigging scene'
    },
  ],
  WORLD_RECORDS: [
    {
      src: `${S3_BASE_URL}/world-records-03.JPG`,
      alt: 'World record slackline attempt',
      objectPosition: 'center 90%',
    },
    {
      src: `${S3_BASE_URL}/world-records-08.JPG`,
      alt: 'World record highlight moment'
    },
    {
      src: `${S3_BASE_URL}/world-records-aidan-02.jpg`,
      alt: 'Athlete on world record line',
      objectPosition: 'center 20%',
    },
    {
      src: `${S3_BASE_URL}/world-records-aidan-01.jpg`,
      alt: 'World record attempt from distance',
      objectPosition: 'center 40%',
    },
    {
      src: `${S3_BASE_URL}/world-records-09.JPG`,
      alt: 'Record-setting slackline performance',
      objectPosition: 'center 0%',
    },
  ],
};

/**
 * Returns a random hero image from the specified image group.
 * When no group is provided, selects from all groups combined.
 */
export function randomS3Image(group?: keyof typeof S3_IMAGES): HeroImage {
  const pool = group ? S3_IMAGES[group] : Object.values(S3_IMAGES).flat();
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Maps discipline enumValues to the closest S3_IMAGES group. */
const DISCIPLINE_ENUM_TO_IMAGE_GROUP: Record<number, keyof typeof S3_IMAGES> = {
  1: 'TRICKLINE',
  2: 'TRICKLINE',
  3: 'TRICKLINE',
  4: 'TRICKLINE',
  5: 'FREESTYLE_HIGHLINE',
  6: 'SPEED_HIGHLINE',
  7: 'SPEED_SHORT',
  8: 'SPEED_HIGHLINE',
  11: 'RIGGING',
  12: 'FREESTYLE_HIGHLINE',
};

/**
 * Returns a random hero image appropriate for the given discipline enum value.
 * Falls back to the RANKINGS pool when no specific group is available.
 */
export function randomS3ImageForDiscipline(disciplineEnum?: string): HeroImage {
  const group = disciplineEnum
    ? DISCIPLINE_ENUM_TO_IMAGE_GROUP[Number(disciplineEnum)]
    : undefined;
  return randomS3Image(group ?? 'RANKINGS');
}
