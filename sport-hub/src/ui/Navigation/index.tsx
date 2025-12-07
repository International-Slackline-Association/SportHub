"use client"

import { cn } from "@utils/cn";
import { useClientMediaQuery } from "@utils/useClientMediaQuery";
import Image from "next/image"
import Link from 'next/link';
import { usePathname } from "next/navigation";
import { PropsWithChildren, useState } from "react";
import type { HTMLAttributes } from "react";
import styles from "./styles.module.css";
import Drawer from "@ui/Drawer";
import UserMenu from "@ui/UserMenu";

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
  const { isDesktop, isHydrated } = useClientMediaQuery();
  const [menuOpen, setMenuOpen] = useState(false);
console.log("isDesktop", isDesktop);

  return (
    <div className={cn(styles.navbar, "cluster", "clearfix", "inter-500")}>
      <div>
        <Image
          alt="logo"
          className={styles.logo}
          height={247}
          src="/static/images/sport-hub-logo.png"
          width={426}
        />
      </div>
      {!isHydrated ? (
        // Show mobile layout during SSR to prevent hydration mismatch
        <button
          aria-expanded={false}
          aria-controls="mobile-menu"
          aria-label="Open navigation menu"
          className="text-white text-6xl"
          disabled
        >
          ☰
        </button>
      ) : isDesktop ? (
        <div className={styles.navContainer}>
          <nav>
            <NavList />
          </nav>
          <UserMenu />
        </div>
      ) : (
        <>
          <div className={styles.navContainer}>
            <UserMenu />
            <button
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Open navigation menu"
              className={styles.mobileMenuButton}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              ☰
            </button>
          </div>
          <Drawer isOpen={menuOpen} onClose={() => setMenuOpen(false)} position="right">
            <nav>
              <NavList onClickItem={() => setMenuOpen(false)} />
            </nav>
          </Drawer>
        </>
      )}
    </div>
  );
}

export default Navigation;
