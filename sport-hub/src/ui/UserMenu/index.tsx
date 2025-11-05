"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useRef, useEffect } from "react"
import styles from "./styles.module.css"
import Button from "@ui/Button"
import Image from "next/image"
import { cn } from "@utils/cn"

export default function UserMenu() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  if (status === "loading") {
    return (
      <div className={styles.userMenuLoading}>
        <div className={styles.userMenuLoadingAvatar} />
      </div>
    )
  }

  if (!session) {
    return (
      <Button
        onClick={() => signIn("cognito")}
        variant="primary"
      >
        Sign In
      </Button>
    )
  }

  return (
    <div className={styles.userMenuRelative} ref={menuRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.userMenuButton}
        aria-expanded={isOpen}
        aria-haspopup="true"
        variant="ghost"
      >
        {session.user.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "User"}
            width={32}
            height={32}
            className={styles.userAvatar}
          />
        ) : (
          <div className={styles.userAvatar}>
            {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
        <div className={styles.userMenuText}>
          <div className={styles.userMenuName}>
            {session.user.name || "User"}
          </div>
          <div className={styles.userMenuEmail}>
            {session.user.email}
          </div>
        </div>
        <svg
          className={cn(styles.chevron, isOpen && styles.chevronOpen)}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>

      {isOpen && (
        <div className={styles.userMenuDropdown}>
          <div className={styles.userMenuDropdownHeader}>
            <div className={styles.userMenuDropdownName}>{session.user.name}</div>
            <div className={styles.userMenuDropdownEmail}>{session.user.email}</div>
          </div>

          <a
            href="/dashboard"
            className={styles.userMenuDropdownLink}
            onClick={() => setIsOpen(false)}
          >
            Dashboard
          </a>

          <button
            onClick={() => {
              setIsOpen(false)
              signOut({ callbackUrl: "/" })
            }}
            className={styles.userMenuDropdownSignOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
