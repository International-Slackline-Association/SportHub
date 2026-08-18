import { Avatar } from '@ui/Avatar';
import { cn } from '@utils/cn';
import ClipBoardButton from './ClipboardButton';
import { SocialIcon } from 'react-social-icons';

type ProfileMediaLinksProps = {
  avatarDefaultLabel?: string;
  isSquare?: boolean;
  links?: string[];
  profileImage?: string;
}

export const ProfileMediaLinks = ({
  avatarDefaultLabel,
  isSquare,
  profileImage,
  links
}: ProfileMediaLinksProps) => {
  return (
    <div className={cn("flex flex-col", "items-center", "gap-4")}>
      <Avatar
        alt={`${avatarDefaultLabel} image`}
        defaultLabel={avatarDefaultLabel || ""}
        image={profileImage}
        isSquare={isSquare}
        size="medium"
      />
      <div className="flex flex-row">
        {links?.map((link, index) => {
          const formattedLink = link.startsWith('http') ? link : `https://${link}`;
          return (
            <SocialIcon
              bgColor="transparent"
              fgColor="#000000"
              key={index}
              target="_blank"
              url={formattedLink} 
            />
          );
        })}
      </div>
      <ClipBoardButton>Copy Link</ClipBoardButton>
    </div>
  );
};
