"use client"

import { useClientMediaQuery } from "@utils/useClientMediaQuery";
import Image from "next/image"
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";

// TODO: Explore options for organizing shared types as site grows
export type LinkType = { name: string; href: string };

const navItems: LinkType[] = [
    {
        href: "/",
        name: "Home",
    },
    {
        href: "/rankings",
        name: "Rankings",
    },
    {
        href: "/events",
        name: "Events",
    },
    {
        href: "/judging",
        name: "Judging",
    },
    {
        href: "/world_records",
        name: "World Records",
    }
];

type NavLinkProps = PropsWithChildren<{ href: string; onClick?: () => void }>;

const NavLink = ({ children, href, onClick }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link aria-current={isActive ? "page" : undefined} href={href} onClick={() => {
      onClick?.();
    }}>
      {children}
    </Link>
  );
};

type NavListProps =  React.HTMLAttributes<HTMLElement> & { onClickItem?: () => void; };

const NavList = ({ onClickItem, ...navProps}: NavListProps) => {
  return (
    <nav {...navProps}>
      <ul>
        {navItems.map(({ name, href }) => (
          <li key={name}> 
              <NavLink href={href} onClick={onClickItem}>{name}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Navigation() {
  const { isDesktop } = useClientMediaQuery();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="navbar clearfix">
      <div className="nav-logo">
        <Image src="/static/images/sport-hub-logo.png" 
          alt="logo"
          layout="intrinsic"
          width={426}
          height={247}
        />
      </div>
      {
        isDesktop ? (
          <NavList className="flex-grow" />
        ) : (
          <>
            <button
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="mobile-menu-button"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="sr-only">Toggle navigation</span>
              ☰
            </button>
            <div
              id="mobile-menu-drawer"
              aria-hidden={!menuOpen}
              className={`mobile-menu-drawer transition-transform duration-300 ease-in-out ${
                menuOpen ? "translate-x-full" : "-translate-x-0"
              }`}
            >
              <NavList className="flex-col" onClickItem={() => setMenuOpen(false)} />
            </div>
          </>
        )
      }
    </div>
  );
};
