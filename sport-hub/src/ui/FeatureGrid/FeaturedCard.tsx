import Link from "next/link";
import Image from "next/image";
import styles from "./styles.module.css";
import { ProfileImage } from "@ui/ProfileImage";
import { cn } from "@utils/cn";
import { Discipline } from "@ui/Badge";

interface FeaturedCardProps {
  id: string;
  name: string;
  image: string;
  country: string;
  countryFlag: string;
  disciplines: Discipline[];
}

const FeaturedCard = ({
  id,
  name,
  country,
  countryFlag,
  disciplines,
}: FeaturedCardProps) => (
  <Link href={`/athlete-profile/${id}`} className={cn("stack", "card", styles.card)} data-card>
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
      <div className="flex gap-2">
        {disciplines.map((discipline) => (
          <Discipline
            key={discipline}
            variant={discipline as Discipline}
          />
        ))}
      </div>
    </div>
  </Link>
);

export default FeaturedCard;
