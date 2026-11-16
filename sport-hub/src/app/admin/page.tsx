import { requirePermission } from "@lib/authorization"
import { auth } from "@lib/auth"
import { rolesLabel, roleHasPermission, type Permission } from "src/types/rbac"
import PageLayout from "@ui/PageLayout"
import { Metadata } from "next"
import { GridSection } from "../components/GridSection"

export const metadata: Metadata = {
  title: 'SportHub - Admin',
}

export default async function AdminPage() {
  // Any admin role may open the dashboard; each card shows only to roles that can use it
  await requirePermission('admin:access');
  const session = await auth();
  const roles = session?.user?.roles;
  const can = (permission: Permission) => roleHasPermission(roles, permission);

  return (
    <PageLayout
      title="Admin Dashboard"
      description={`Signed in as ${rolesLabel(roles)}. You see the tools your roles can use.`}
    >
      <div className="p-4 sm:p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {can('events:create') && (
            <GridSection
              color="blue"
              title="Submit Event"
              href="/events/submit"
              content="Create and publish new events, contests, or competitions"
            />
          )}

          {can('events:edit') && (
            <GridSection
              color="green"
              title="Event Approval"
              href="/admin/event-approval"
              content="Review and approve events submitted by organizers"
            />
          )}

          {can('events:edit') && (
            <GridSection
              color="amber"
              title="Score Review"
              href="/admin/score-review"
              content="Review edits to already-published results before they go live"
            />
          )}

          {can('records:review') && (
            <GridSection
              color="red"
              title="Records and Firsts"
              href="/admin/records-review"
              content="Review claims, manage record categories and resolve the sheet import"
            />
          )}

          {can('records:manage') && (
            <GridSection
              color="blue"
              title="All Records and Firsts"
              href="/admin/records-all"
              content="Every record and first in the workflow, whatever its status: draft, under review, changes requested, published, former, rejected or voided"
            />
          )}

          {can('users:manage') && (
            <GridSection
              color="green"
              title="Duplicate Accounts"
              href="/admin/duplicate-accounts"
              content="Merge split contest results from a secondary account into the main profile"
            />
          )}

          {can('users:manage') && (
            <GridSection
              color="red"
              title="Manage Users"
              href="/test_SSR"
              content="View and manage user accounts"
            />
          )}

          <GridSection
            color="gray"
            title="Reports"
            className="opacity-50"
            content="View analytics and reports (Coming soon)"
          />

          <GridSection
            color="gray"
            title="Settings"
            className="opacity-50"
            content="Configure platform settings (Coming soon)"
          />
        </div>
      </div>
    </PageLayout>
  )
}
