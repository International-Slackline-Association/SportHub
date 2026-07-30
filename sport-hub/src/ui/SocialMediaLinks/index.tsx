import { Avatar } from '@ui/Avatar';
import { cn } from '@utils/cn';
import SocialTags, { SocialMedia } from './SocialTags';
import ClipBoardButton from './ClipboardButton';

type SocialMediaLinksProps = {
  avatarDefaultLabel?: string;
  profileImage?: string;
  links?: SocialMedia;
  isSquare?: boolean;
}

export const SocialMediaLinks = ({
  avatarDefaultLabel,
  isSquare,
  profileImage,
  links
}: SocialMediaLinksProps) => {
  return (
    <div className={cn("flex flex-col", "items-center", "gap-4")}>
      <Avatar
        alt={`${avatarDefaultLabel} image`}
        defaultLabel={avatarDefaultLabel || ""}
        image={profileImage}
        isSquare={isSquare}
        size="medium"
      />
      {/* TODO: create share bottom drawer for socials & profile link for mobile */}
      {links && <SocialTags socials={links} />}
      <ClipBoardButton>Copy Link</ClipBoardButton>
    </div>
  );
};
