"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Header } from "@slacklineinternational/onsight/react"
import UserMenu from "@ui/UserMenu"
import { SlacklineSportHubIcon } from "@ui/Icons"

const navItems = [
  { href: "/", label: "Home" },
  { href: "/rankings", label: "Rankings" },
  { href: "/events", label: "Competitions" },
  { href: "/judging", label: "Judging" },
  { href: "/world_records", label: "Records & Firsts" },
]

const Navigation = () => {
  const pathname = usePathname()

  return (
    <Header
      actions={<UserMenu />}
      brand={(
        <span className="block max-w-[min(350px,calc(100vw-9rem))] [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-10 [&_svg]:w-full">
          <SlacklineSportHubIcon />
        </span>
      )}
      brandLabel="SportHub home"
      items={navItems.map((item) => ({ ...item, current: pathname === item.href }))}
      linkAs={Link}
    />
  )
}

export default Navigation
