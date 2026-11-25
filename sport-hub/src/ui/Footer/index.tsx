import Link from "next/link"
import Image from "next/image"
import { Footer as SiteFooter } from "@slacklineinternational/onsight/react"

const footerLinks = [
  { label: "Frequently Asked Questions", href: "https://data.slacklineinternational.org/sport/ranking-list-faq/" },
  { label: "ISA Members and Partners", href: "https://www.slacklineinternational.org/members-partners/" },
  { label: "Event Registration", href: "/events/submit" },
  { label: "Open Source", href: "https://github.com/International-Slackline-Association/SportHub" },
  { label: "About ISA Sports", href: "https://www.slacklineinternational.org/sport/" },
  { label: "Contact Us", href: "mailto:info@slacklineinternational.org" },
]

const Footer = () => {
  return (
    <SiteFooter className="sport-hub-footer" linkAs={Link} links={footerLinks} navLabel="Footer">
      <div className="sport-hub-footer__brand">
        <Image
          alt="ISA Sport"
          height={70}
          src="/static/images/sport-hub-logo.png"
          width={120}
        />
      </div>
    </SiteFooter>
  )
}

export default Footer
