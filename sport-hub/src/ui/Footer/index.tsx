import Link from "next/link";
import Image from "next/image";
import { LinkType } from "@ui/Navigation";
import styles from "./styles.module.css"

const footer_items: LinkType[] = [
  { name: "Frequently Asked Questions", href: "https://data.slacklineinternational.org/sport/ranking-list-faq/" },
  { name: "ISA Members and Partners", href: "https://www.slacklineinternational.org/members-partners/" },
  { name: "Event Registration", href: "/events/submit" },
  { name: "Open Source", href: "https://github.com/International-Slackline-Association/SportHub" },
  { name: "About ISA Sports", href: "https://www.slacklineinternational.org/sport/" },
  { name: "Contact Us", href: "mailto:info@slacklineinternational.org" },
];

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        {footer_items.map(({ href, name }) => (
          <Link key={name} href={href}>
            {name}
          </Link>
        ))}
      </div>
      <div className={styles.footerColumnLogos}>
        <div>
          <Image
            alt="logo"
            className={styles.logo}
            height={247}
            src="/static/images/sport-hub-logo.png"
            width={426}
          />
        </div>
      </div>
    </footer>
  );
};

export default Footer;