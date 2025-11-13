import { auth } from "@lib/auth"
import { redirect } from "next/navigation"
import PageLayout from "@ui/PageLayout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: 'SportHub - Admin',
}

export default async function AdminPage() {
  const session = await auth()

  if (!session) {
    redirect("/auth/signin")
  }

  return (
    <PageLayout
      title="Admin"
      description="Modify data"
    >
      Under construction...
    </PageLayout>
  )
}
