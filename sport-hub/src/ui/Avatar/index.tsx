import styles from './styles.module.css';
import Image from 'next/image';

interface AvatarProps {
  alt: string;
  defaultLabel: string;
  image?: string;
}

export const Avatar = ({ alt, defaultLabel, image }: AvatarProps) => {
  if (image) {
    return (
      <div className={styles.avatarWrapper}>
        <Image
          alt={alt}
          className={styles.avatar}
          height={200}
          src={image}
          width={200}
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
