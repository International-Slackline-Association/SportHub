import Image from 'next/image';
import styles from './styles.module.css';

interface ProfileImageProps {
  src?: string;
  alt?: string;
  name?: string;
}

// Updated component to handle actual profile images with fallback
export const ProfileImage = ({ src, alt, name }: ProfileImageProps) => {
  // If no image provided, show default placeholder with initials
  if (!src) {
    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
    return (
      <div className={styles.avatar}>
        <div className={styles.initials}>{initials}</div>
      </div>
    );
  }

  return (
    <div className={styles.avatarContainer}>
      <Image
        src={src}
        alt={alt || 'Profile image'}
        width={225}
        height={225}
        className={styles.avatarImage}
        onError={(e) => {
          // If image fails to load, hide it and show placeholder
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.nextSibling) {
            (target.nextSibling as HTMLElement).style.display = 'flex';
          }
        }}
      />
      <div className={styles.avatar} style={{ display: 'none' }}>
        <div className={styles.initials}>
          {name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?'}
        </div>
      </div>
    </div>
  );
};
