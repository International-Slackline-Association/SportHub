"use client"

import { cn } from "@utils/cn";
import { useClientMediaQuery } from "@utils/useClientMediaQuery";
import Image from "next/image"
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";
import type { HTMLAttributes } from "react";

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
    },
    {
        href: "/athlete-profile",
        name: "Athlete Profile",
    },
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

type NavListProps =  HTMLAttributes<HTMLElement> & { onClickItem?: () => void; };

const NavList = ({ onClickItem }: NavListProps) => {
  return (
    <ul>
      {navItems.map(({ name, href }) => (
        <li key={name}> 
            <NavLink href={href} onClick={onClickItem}>{name}</NavLink>
        </li>
      ))}
    </ul>
  );
}

const Navigation = () => {
  const { isDesktop } = useClientMediaQuery();
  const [menuOpen, setMenuOpen] = useState(false);
  console.log(menuOpen);

  return (
    <div className={cn(styles.navbar, "cluster", "clearfix", "inter-500")}>
      <div>
        <Image
          alt="logo"
          width={426}
          height={247}
          priority
        />
      </div>
      {isDesktop ? (
        <nav>
          <NavList />
        </nav>
      ) : (
        <>
          <button
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Open navigation menu"
            className="text-white text-6xl"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
          <Drawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} position="right">
            <nav>
              <button
                aria-label="Close navigation menu"
                className="text-white text-6xl pt-4 pl-4"
                onClick={() => setMenuOpen(false)}
              >
                ✕
              </button>
              <NavList onClickItem={() => setMenuOpen(false)} />
            </nav>
          </Drawer>
        </>
      )}
    </div>
  );
}

export default Navigation;
