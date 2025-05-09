import Image from 'next/image';

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
      {instagram && (<Image src="/static/images/social/instagram.svg" alt="Instagram" width={24} height={24} />)}
      {youtube && (<Image src="/static/images/social/youtube.svg" alt="YouTube" width={24} height={24} />)}
      {tiktok && (<Image src="/static/images/social/tiktok.svg" alt="TikTok" width={24} height={24} />)}
      {twitch && (<Image src="/static/images/social/twitch.svg" alt="Twitch" width={24} height={24} />)}
      {whatsapp && (<Image src="/static/images/social/whatsapp.svg" alt="WhatsApp" width={24} height={24} />)}
      {facebook && (<Image src="/static/images/social/facebook.svg" alt="Facebook" width={24} height={24} />)}
    </div>
  );
};

export default SocialTags;
