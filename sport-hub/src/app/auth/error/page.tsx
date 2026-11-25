"use client"

import { useSearchParams } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import { Suspense } from "react"
import Link from "next/link"

function ErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: "Server Configuration Error",
      description: "There is a problem with the server configuration. Please contact support."
    },
    AccessDenied: {
      title: "Access Denied",
      description: "You do not have permission to sign in."
    },
    Verification: {
      title: "Verification Error",
      description: "The verification token has expired or has already been used."
    },
    Default: {
      title: "Authentication Error",
      description: "An error occurred during authentication. Please try again."
    }
  }

  const errorInfo = errorMessages[error || "Default"] || errorMessages.Default

  return (
    <PageLayout title="Error" description="Authentication error">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-default shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-status-danger-bg mb-4">
                <svg
                  className="h-6 w-6 text-danger"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-default mb-2">
                {errorInfo.title}
              </h2>
              <p className="text-sm text-default mb-6">
                {errorInfo.description}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-subtle rounded-md">
                  <p className="text-xs text-muted font-mono">Error: {error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/signin"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-inverse bg-action-primary-bg hover:bg-action-primary-bg-hover"
                >
                  Try Again
                </Link>
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-default text-sm font-medium rounded-md text-default bg-default hover:bg-subtle"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <PageLayout title="Error" description="Authentication error">
        <div className="flex items-center justify-center p-4">
          <div className="animate-pulse text-muted">Loading...</div>
        </div>
      </PageLayout>
    }>
      <ErrorContent />
    </Suspense>
  )
}
