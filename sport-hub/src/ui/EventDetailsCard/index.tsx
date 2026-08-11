import type { EventRecord } from '@lib/relational-types';
import { Badge, Country, Role } from '@ui/Badge';
import { LabelValuePair } from '@ui/LabelValuePair';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { ProfileMediaLinks } from '@ui/ProfileMediaLinks';
import { getCountryByCode } from '@utils/countries';
import Image from 'next/image';
import styles from "./styles.module.css";
import { formatDateRange } from '@utils/dates';
import Link from 'next/link';

const linkClassName = 'text-blue-600 hover:text-blue-800 hover:underline font-medium';

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
	startDate: string;
	endDate: string;
	website?: string;
	links?: string[];
  // Admin form shape uses different property names
  city?: string;
  country?: string;
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
		startDate,
		endDate,
		city,
		country,
		name,
		website,
		links,
		profileUrl,
		thumbnailUrl,
		verified,
	} = event;

	const countryName = getCountryByCode(country?.toLowerCase() || "")?.name;
  const youtubeId = extractYouTubeId(thumbnailUrl || '');
	const dateRange = formatDateRange(new Date(startDate), new Date(endDate));

	return (
    <StackedMediaCard
			className={styles.eventDetailsCard}
      media={<ProfileMediaLinks profileImage={profileUrl} isSquare links={links} />}
      desktopDirection="horizontal"
			mobileDirection="vertical"
    >
			<div className="flex flex-row">
				<div className="grid grid-flow-row grid-cols-2 gap-4 p-4 text-left">
					<div className="flex flex-col gap-2 col-span-full">
						{verified ? <Role variant="ISA_VERIFIED" /> : <Badge color="NEUTRAL">Unverified</Badge>}
						<h2>{name}</h2>
					</div>
					<LabelValuePair label="Date" value={dateRange} />
					<LabelValuePair
						label="Location"
						value={<Country countryCode={country || "N/A"} label={[city, countryName].filter(Boolean).join(', ')} />}
					/>
					<LabelValuePair
						label="Website"
						value={
							website ? (
								<Link className={linkClassName} href={website || ""}>
									{website}
								</Link>
							) : "None"
						} 
					/>
					{/* <LabelValuePair label="Total Winning Points Awarded" value={prize != null && prize !== 0 ? `${Number(prize).toLocaleString()} pts` : undefined} />
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
					</div> */}
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
