import type { EventRecord } from '@lib/relational-types';
import { Discipline, Badge, Country, Role } from '@ui/Badge';
import { LabelValuePair } from '@ui/LabelValuePair';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { SocialMediaLinks } from '@ui/SocialMediaLinks';
import { getCountryByCode } from '@utils/countries';
import Image from 'next/image';
import styles from "./styles.module.css";

// Duplicate from YouTubePreviewTextField for server
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

type EventLike = Partial<EventRecord> & {
  // Admin form shape uses different property names
  date?: string | Date | null;
  city?: string;
  name?: string;
  discipline?: string | string[];
  prize?: string | number;
  // Admin form shape uses disciplines array and may not have participants yet
  disciplines?: string[];
  athletes?: Array<unknown>;
  verified?: boolean;
};

type EventDetailsCardProps = {
  event: EventLike;
};

const formatDate = (d?: string | Date | null) => {
	if (!d) return '';
	try {
		const date = typeof d === 'string' ? new Date(d) : d;
		if (isNaN(date.getTime())) return '';
		return date.toLocaleDateString('en-GB');
	} catch {
		return '';
	}
};

// TODO: Use these utility functions when implementing full event details
// const formatPrizeEUR = (value: unknown): string => {
// 	if (value === null || value === undefined || value === '') return '';
// 	const num = typeof value === 'string' ? Number(value) : (value as number);
// 	if (typeof num !== 'number' || Number.isNaN(num)) return String(value ?? '');
// 	try {
// 		return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR' }).format(num);
// 	} catch {
// 		return String(num);
// 	}
// };

export const EventDetailsCard = ({ event }: EventDetailsCardProps) => {
	const {
		date,
		city,
		country,
		name,
		discipline,
		prize,
		profileUrl,
		thumbnailUrl,
		verified,
	} = event;

	const disciplineList = Array.isArray(discipline) ? (discipline as string[]) : (discipline ? [discipline as string] : []);
	const countryName = getCountryByCode(country?.toLowerCase() || "")?.name;
  const youtubeId = extractYouTubeId(thumbnailUrl || '');

	return (
    <StackedMediaCard
			className={styles.eventDetailsCard}
      media={<SocialMediaLinks profileImage={profileUrl} />}
      desktopDirection="horizontal"
			mobileDirection="vertical"
    >
			<div className="flex flex-row">
				<div className="grid grid-flow-row grid-cols-2 gap-4 p-4 text-left">
					<div className="flex flex-col gap-2 col-span-full">
						{verified ? <Role variant="ISA_VERIFIED" /> : <Badge color="NEUTRAL">Unverified</Badge>}
						<h2>{name}</h2>
					</div>
					<LabelValuePair label="Date" value={formatDate(date)} />
					<LabelValuePair
						label="Location"
						value={<Country countryCode={country || "N/A"} label={`${city}, ${countryName}`} />}
					/>
					<LabelValuePair label="Website" value={""} />
					<LabelValuePair label="Total Event Prize Value" value={prize} />
					<div className="col-span-full">
						<LabelValuePair
							label="Discipline(s)"
							value={(
								<>
									{disciplineList.map((d, i) => (
										<Discipline key={`${d}-${i}`} variant={d} />
									))}
								</>
							)}
						/>
					</div>
				</div>
				{!!youtubeId &&
					<Image
						alt="YouTube video thumbnail"
						width={444}
						height={250}
						src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
					/>
				}
			</div>
    </StackedMediaCard>
	);
};
