import { AthleteProfile } from '@lib/data-services';
import { cn } from '@utils/cn';
import { JSX } from 'react';
import ClipBoardButton from './ClipboardButton';
import Image from 'next/image';
import styles from './styles.module.css';
import SocialTags from './SocialTags';
import { ProfileImage } from '@ui/ProfileImage';
import { Discipline, Role } from '@ui/Badge';

type LabelValuePairProps = {
  label: string;
  value: string | number | JSX.Element;
};

const LabelValuePair = ({ label, value }: LabelValuePairProps) => {
  return (
    <div className="flex flex-col gap-1">
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
};

type ProfileCardProps = {
  profile: AthleteProfile;
}

// TODO: Create TwoColumnLayout component to improve readability as design unfolds
export const ProfileCard = ({ profile }: ProfileCardProps) => {
  const { socialMedia } = profile;

  return (
    <section className={cn("stack", "card", styles.profileCard)}>
      <div className={cn("stack", "items-center", "gap-4")}>
        <ProfileImage
          name={profile.name}
          alt={`${profile.name} profile image`}
        />
        <SocialTags socials={socialMedia} />
        <ClipBoardButton>Copy Profile Link</ClipBoardButton>
      </div>

      <div className="stack gap-4 my-4 sm:my-0 sm:w-4/5 sm:gap-2">
        <div className={cn(styles.nameAndRoles, "stack", "gap-2")}>
          <div className="flex gap-2">
            {profile.roles.map((role) => (
              <Role
                key={role}
                variant={role as Role}
              />
            ))}
          </div>
          <h1 className={styles.name}>{profile.name}</h1>
        </div>

        <div className={cn("stack", "gap-4")}>
          <div className="stack gap-2">
            <div className={styles.athleteDetails}>
              <LabelValuePair
                label="Age"
                value={profile.age}
              />
              <LabelValuePair
                label="Country"
                value={(
                  <div className="flex items-center gap-1">
                    <Image className="rounded-xs" src="/static/images/flags/canada.svg" alt="Canada Flag" width={20} height={14} />
                    <span className={styles.detailValue}>{profile.country}</span>
                  </div>
                )}
              />
              <LabelValuePair
                label="Website"
                value={profile.website}
              />
            </div>
            <LabelValuePair
              label="Sponsors"
              value={profile.sponsors}
            />
          </div>

          <div className="sm:mt-4">
            <p className={styles.detailLabel}>Disciplines</p>
            <div className="flex gap-2">
              {profile.disciplines.map((discipline) => (
                <Discipline
                key={discipline}
                variant={discipline as Discipline}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
