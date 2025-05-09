import { AthleteProfile } from '@mocks/athlete_profile';
import { cn } from '@utils/cn';
import { JSX } from 'react';
import ClipBoardButton from './ClipboardButton';
import DisciplineTags from './DisciplineTags';
import Image from 'next/image';
import RoleTags from './RoleTags';
import styles from './styles.module.css';
import SocialTags from './SocialTags';

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
    <section className={cn("flex gap-20", styles.profileCard)}>
      <div className="w-1/5">
        <div className="flex flex-col items-center gap-4">
          {/* Placeholder avatar image */}
          <div className={styles.avatar}></div>   
          <SocialTags socials={socialMedia} />
          <ClipBoardButton>Copy Profile Link</ClipBoardButton>
        </div>
      </div>
      
      <div className="w-4/5">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <RoleTags roles={profile.roles as Roles[]} />
          </div>
          <h1 className={styles.name}>{profile.name}</h1>
        </div>
        
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
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
            <LabelValuePair
              label="Sponsors"
              value={profile.sponsors}
            />
          </div>
          
          <div className="mt-4">
            <p className={styles.detailLabel}>Disciplines</p>
            <DisciplineTags disciplines={profile.disciplines as Disciplines[]} />
          </div>
        </div>
      </div>
    </section>
  );
};
