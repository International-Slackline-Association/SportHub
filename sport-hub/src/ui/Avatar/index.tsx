import { Avatar as IsaAvatar } from '@slacklineinternational/onsight/react';

export type AvatarSize = 'small' | 'medium' | 'large';

interface AvatarProps {
  alt: string;
  defaultLabel: string;
  image?: string;
  size?: AvatarSize;
  isSquare?: boolean;
}

/** Sport Hub sizes were 80, 120 and 200px. Onsight's named sizes stop at 120. */
const SIZE = {
  small: 'large',
  medium: 'xlarge',
  large: 'xlarge',
} as const;

export const Avatar = ({ alt, defaultLabel, image, size = 'medium', isSquare = false }: AvatarProps) => {
  return (
    <IsaAvatar
      alt={alt}
      name={defaultLabel || alt}
      size={SIZE[size]}
      square={isSquare}
      src={image}
      style={size === 'large' ? { ['--isa-avatar-size' as string]: '200px' } : undefined}
    />
  );
};

export default Avatar;
