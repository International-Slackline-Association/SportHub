import Link from "next/link";
import Image from "next/image";
import { LinkType } from "@ui/Navigation";
import styles from "./styles.module.css"

const footer_items: LinkType[] = [
  { name: "Frequently Asked Questions", href: "/faq" },
  { name: "ISA Members and Partners", href: "/partners" },
  { name: "Event Registration", href: "/events" },
  { name: "Open Source", href: "https://github.com/International-Slackline-Association" },
  { name: "About ISA Sports", href: "/about" },
  { name: "Contact Us", href: "/contact" },
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
            height={112}
            src="/static/images/ISA_logo.png"
            width={623}
          />
        </div>
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