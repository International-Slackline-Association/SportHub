import { SocialIcon } from 'react-social-icons/component';
import 'react-social-icons/instagram';
import 'react-social-icons/youtube';
import 'react-social-icons/tiktok';
import 'react-social-icons/twitch';
import 'react-social-icons/whatsapp';
import 'react-social-icons/facebook';

type SocialMedia = {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  whatsapp?: string;
  twitch?: string;
  tiktok?: string;
};

type SocialTagsProps = {
  socials: SocialMedia;
};

const SocialTags = ({ socials: {
  instagram,
  youtube,
  facebook,
  whatsapp,
  twitch,
  tiktok,
} }: SocialTagsProps) => {
  return (
    <div className="flex gap-4 mt-2">
      {instagram && (<SocialIcon network="instagram" url={instagram} />)}
      {youtube && (<SocialIcon network="youtube" url={youtube} />)}
      {tiktok && (<SocialIcon network="tiktok" url={tiktok} />)}
      {twitch && (<SocialIcon network="twitch" url={twitch} />)}
      {whatsapp && (<SocialIcon network="whatsapp" url={whatsapp} />)}
      {facebook && (<SocialIcon network="facebook" url={facebook} />)}
    </div>
  );
};

export default SocialTags;
