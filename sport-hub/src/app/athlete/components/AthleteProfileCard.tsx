import { AthleteProfile } from '@lib/data-services';
import styles from './styles.module.css';
import { StackedMediaCard } from '@ui/StackedMediaCard';
import { Country, Discipline, Role } from '@ui/Badge';
import { LabelValuePair } from '@ui/LabelValuePair';
import { SocialMediaLinks } from "@ui/SocialMediaLinks";

type AthleteProfileCardProps = {
  athlete: AthleteProfile;
}

export const AthleteProfileCard = ({ athlete }: AthleteProfileCardProps) => {
  const {
    name,
    surname,
    socialMedia,
    roles,
    age,
    country,
    city,
    sponsors,
    disciplines,
    profileImage
  } = athlete;

  const displayName = `${name} ${surname || ""}`.trim();
  const abbreviatedName = `${name.toUpperCase().charAt(0)}${surname?.toUpperCase().charAt(0) || ""}`;

  return (
    <StackedMediaCard
      className={styles.athleteProfileCard}
      media={<SocialMediaLinks avatarDefaultLabel={abbreviatedName} profileImage={profileImage} links={socialMedia} />}
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
          value={(<Country countryCode={country.toLowerCase()} />)}
        />
        <LabelValuePair label="City" value={city} />
        <LabelValuePair label="Sponsors" value={sponsors} />
        <div className="col-span-full">
          <LabelValuePair
            label="Discipline(s)"
            value={(
              <>
                {disciplines.map(discipline => (
                  <Discipline key={discipline} variant={discipline as Discipline} />
                ))}
              </>
            )}
          />
        </div>
      </div>
    </StackedMediaCard>
  );
};
