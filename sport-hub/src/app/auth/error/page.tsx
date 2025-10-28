"use client"

import { useSearchParams } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import { Suspense } from "react"

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
      <div className="flex items-center justify-center p-4 sm:p-0">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg
                  className="h-6 w-6 text-red-600"
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

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {errorInfo.title}
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                {errorInfo.description}
              </p>

              {error && (
                <div className="mb-6 p-3 bg-gray-50 rounded-md">
                  <p className="text-xs text-gray-500 font-mono">Error: {error}</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <a
                  href="/auth/signin"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </a>
                <a
                  href="/"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Home
                </a>
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
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      </PageLayout>
    }>
      <ErrorContent />
    </Suspense>
  )
}
