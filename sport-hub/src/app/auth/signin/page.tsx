"use client"

import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import { Suspense } from "react"
import Link from "next/link"

function SignInContent() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")

  const handleSignIn = () => {
    signIn("cognito", { callbackUrl })
  }

  return (
    <PageLayout title="Sign In" description="Sign in to SportHub">
      <div className="flex items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-default shadow-lg rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-default">Welcome to SportHub</h2>
              <p className="mt-2 text-sm text-default">
                Sign in with your ISA Slackline account
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-status-danger-bg border border-danger rounded-md">
                <p className="text-sm text-danger">
                  {error === "OAuthSignin" && "Error occurred during sign in. Please try again."}
                  {error === "OAuthCallback" && "Error occurred during authentication callback."}
                  {error === "OAuthCreateAccount" && "Could not create user account."}
                  {error === "EmailCreateAccount" && "Could not create user account."}
                  {error === "Callback" && "Error occurred during callback."}
                  {error === "OAuthAccountNotLinked" && "Account already exists with different provider."}
                  {error === "EmailSignin" && "Check your email address."}
                  {error === "CredentialsSignin" && "Sign in failed. Check your credentials."}
                  {error === "SessionRequired" && "Please sign in to access this page."}
                  {!["OAuthSignin", "OAuthCallback", "OAuthCreateAccount", "EmailCreateAccount", "Callback", "OAuthAccountNotLinked", "EmailSignin", "CredentialsSignin", "SessionRequired"].includes(error) && "An error occurred. Please try again."}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-base font-medium rounded-md text-inverse bg-action-primary-bg hover:bg-action-primary-bg-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-border-focus transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                Sign in with AWS Cognito
              </button>

              <p className="text-xs text-center text-muted">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-link hover:text-link-hover"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <PageLayout title="Sign In" description="Sign in to SportHub">
        <div className="flex items-center justify-center p-4">
          <div className="animate-pulse text-muted">Loading...</div>
        </div>
      </PageLayout>
    }>
      <SignInContent />
    </Suspense>
  )
}
