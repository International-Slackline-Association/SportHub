import styles from './styles.module.css';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { Country, Discipline, Role } from '@ui/Badge';
import { LabelValuePair } from '@ui/LabelValuePair';
import { ProfileMediaLinks } from "@ui/ProfileMediaLinks";
import { UserProfileRecord } from '@lib/relational-types';

type AthleteProfileCardProps = UserProfileRecord & {
  disciplines?: Discipline[];
}

export const AthleteProfileCard = ({ disciplines, ...athleteProfile }: AthleteProfileCardProps) => {
  const {
    name,
    surname,
    birthdate,
    country,
    city,
    profileUrl,
    thumbnailUrl,
    links,
    userSubTypes,
  } = athleteProfile;

  // Calculate age from birthdate
  let age: number | undefined;
  if (birthdate) {
    const birth = new Date(birthdate);
    const now = new Date();
    age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
  }

  const roles = userSubTypes?.map((t: string) => t.toUpperCase()) || ['ATHLETE'];

  const profileImage = profileUrl || thumbnailUrl || undefined;

  const displayName = `${name} ${surname || ""}`.trim();
  const abbreviatedName = `${name?.toUpperCase().charAt(0)}${surname?.toUpperCase().charAt(0) || ""}`;

  return (
    <StackedMediaCard
      className={styles.athleteProfileCard}
      media={<ProfileMediaLinks avatarDefaultLabel={abbreviatedName} profileImage={profileImage} links={links} />}
      desktopDirection="horizontal"
      mobileDirection="vertical"
    >
      <div className="grid grid-flow-row grid-cols-2 gap-4 p-4 text-left">
				<div className="flex flex-col gap-2 col-span-full">
          <div className="flex gap-2">
            {roles.map((role) => (
              <Role key={role} variant={role as Role} />
            ))}
          </div>
          <h2>{displayName}</h2>
        </div>
        <LabelValuePair label="Age" value={age} />
        <LabelValuePair
          label="Country"
          value={(<Country countryCode={country?.toLowerCase() || ""} />)}
        />
        <LabelValuePair label="City" value={city} />
        {/* TODO add sponsors to DB */}
        <LabelValuePair label="Sponsors" value={""} />
        <div className="col-span-full">
          <LabelValuePair
            label="Discipline(s)"
            value={(
              <span className="flex flex-row flex-wrap gap-1">
                {disciplines?.map(discipline => (
                  <Discipline key={discipline} variant={discipline as Discipline} />
                ))}
              </span>
            )}
          />
        </div>
      </div>
    </StackedMediaCard>
  );
};
