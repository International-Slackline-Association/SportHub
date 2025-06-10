import Link from "next/link";
import Image from "next/image";
import styles from "./styles.module.css";
import { ProfileImage } from "@ui/ProfileImage";
import DisciplineTags from "@ui/ProfileCard/DisciplineTags";
import { cn } from "@utils/cn";

interface FeaturedCardProps {
  id: string;
  name: string;
  image: string;
  country: string;
  countryFlag: string;
  disciplines: Disciplines[];
}

export default function FeaturedCard({
  id,
  name,
  country,
  countryFlag,
  disciplines,
}: FeaturedCardProps) {
  return (
    <Link href={`/athlete-profile/${id}`} className={cn("stack", "card", styles.card)}>
      <ProfileImage />
      <div className={styles.content}>
        <h2 className={styles.name}>{name}</h2>
        
        <div className={styles.countryContainer}>
          <div className={styles.flagContainer}>
            <Image 
              src={countryFlag}
              alt={country}
              width={22}
              height={22}
              className={styles.flag}
            />
            <span>{country}</span>
          </div>
        </div>
        
        <DisciplineTags className="justify-center" disciplines={disciplines} />
      </div>
    </Link>
  );
}
