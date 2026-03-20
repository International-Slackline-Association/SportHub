import styles from './styles.module.css';
import Image from 'next/image';

interface AvatarProps {
  alt: string;
  defaultLabel: string;
  image?: string;
}

export const Avatar = ({ alt, defaultLabel, image }: AvatarProps) => {
  if (image) {
    const isDataUrl = image.startsWith('data:');
    return (
      <div className={styles.avatarWrapper}>
        <Image
          alt={alt}
          className={styles.avatar}
          fill
          sizes="(max-width: 640px) 80px, 200px"
          src={image}
          unoptimized={isDataUrl}
        />
      </div>
    );
  }

  return (
    <div className={styles.avatarWrapper}>
      <div className={styles.avatarPlaceholder}>
        {defaultLabel}
      </div>
    </div>
  );
};

export default Avatar;
