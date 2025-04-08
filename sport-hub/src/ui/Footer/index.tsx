import Link from "next/link";
import Image from "next/image";
import { LinkType } from "@ui/Navigation";

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
        <footer>
            <div className="footer-grid">
                {footer_items.map(({ href, name }) => (
                    <Link key={name} href={href}>
                        {name}
                    </Link>
                ))}
            </div>
            <div className="footer-column-logos">
                <Image 
                    className="isa-logo"
                    src="/static/images/ISA_logo.png"
                    alt="logo"
                    width={623}
                    height={112}
                />
                <Image
                    className="sport-img"
                    src="/static/images/sport-hub-logo.png"
                    alt="logo"
                    width={426}
                    height={247}
                />
            </div>
        </footer>
    );
};

export default Footer;