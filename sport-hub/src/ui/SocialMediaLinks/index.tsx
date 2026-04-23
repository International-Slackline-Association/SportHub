import { Avatar } from '@ui/Avatar';
import { cn } from '@utils/cn';
import SocialTags, { SocialMedia } from './SocialTags';
import ClipBoardButton from './ClipboardButton';

type SocialMediaLinksProps = {
  avatarDefaultLabel?: string;
  profileImage?: string;
  links?: SocialMedia;
}

export const SocialMediaLinks = ({ avatarDefaultLabel, profileImage, links }: SocialMediaLinksProps) => {
  return (
    <div className={cn("flex flex-col", "items-center", "gap-4")}>
      <Avatar
        alt={`${avatarDefaultLabel} image`}
        defaultLabel={avatarDefaultLabel || ""}
        image={profileImage}
        size="medium"
      />
      {/* TODO: create share bottom drawer for socials & profile link for mobile */}
      {links && <SocialTags socials={links} />}
      <ClipBoardButton>Copy Profile Link</ClipBoardButton>
    </div>
  );
};
