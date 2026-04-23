import styles from './styles.module.css';
import Image from 'next/image';
import { cn } from '@utils/cn';

export type AvatarSize = 'small' | 'medium' | 'large';

const AVATAR_SIZE_PIXELS: Record<AvatarSize, number> = {
  small: 80,
  medium: 120,
  large: 200,
};

const AVATAR_FONT_SIZE: Record<AvatarSize, string> = {
  small: '1.5rem',
  medium: '1.75rem',
  large: '2rem',
};

interface AvatarProps {
  alt: string;
  defaultLabel: string;
  image?: string;
  size?: AvatarSize;
}

export const Avatar = ({ alt, defaultLabel, image, size = 'medium' }: AvatarProps) => {
  const avatarSizePx = AVATAR_SIZE_PIXELS[size];

  if (image) {
    const isDataUrl = image.startsWith('data:');
    return (
      <div
        className={styles.avatarWrapper}
        style={{
          width: `${avatarSizePx}px`,
          height: `${avatarSizePx}px`,
        }}
      >
        <Image
          alt={alt}
          className={styles.avatar}
          fill
          sizes={`${avatarSizePx}px`}
          src={image}
          unoptimized={isDataUrl}
        />
      </div>
    );
  }

  return (
    <div
      className={styles.avatarWrapper}
      style={{
        width: `${avatarSizePx}px`,
        height: `${avatarSizePx}px`,
      }}
    >
      <div
        className={cn(styles.avatarPlaceholder)}
        style={{
          fontSize: AVATAR_FONT_SIZE[size],
        }}
      >
        {defaultLabel}
      </div>
    </div>
  );
};

export default Avatar;
