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
      <div className="flex items-center justify-center p-4 sm:p-0">
        <div className="w-full max-w-md space-y-8">
          <div className="bg-white shadow-lg rounded-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome to SportHub</h2>
              <p className="mt-2 text-sm text-gray-600">
                Sign in with your ISA Slackline account
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">
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
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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

              <p className="text-xs text-center text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm text-blue-600 hover:text-blue-800"
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
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      </PageLayout>
    }>
      <SignInContent />
    </Suspense>
  )
}
