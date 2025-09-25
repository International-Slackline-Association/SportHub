import type { Metadata } from "next";
import Button from "@ui/Button";
import { AgeCategory, Badge, ContestSize, Discipline, Gender, Role } from "@ui/Badge";
import PageLayout from "@ui/PageLayout";

export const metadata: Metadata = {
  title: 'SportHub - Demo',
}

export default async function Page() {
  return (
    <PageLayout
      title="Component Library"
      description="A space to view all our components for testing purposes"
    >
      <section className="p-4 sm:p-0">
        <h2>Buttons</h2>
        <div className="flex flex-row gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="default">Default Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="destructive-secondary">Destructive Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
        </div>
      </section>
      <section className="p-4 sm:p-0">
        <h2>Badges</h2>
        <div className="flex flex-row gap-4">
          <div className="stack gap-4">
            <strong>Contest Size</strong>
            <ContestSize variant="OPEN" />
            <ContestSize variant="MASTERS" />
            <ContestSize variant="GRAND_SLAM" />
            <ContestSize variant="WORLD_CUP" />
            <ContestSize variant="WORLD_CHAMPIONSHIP" />
          </div>
          <div className="stack gap-4">
            <strong>Discipline</strong>
            <Discipline variant="SPEED_HIGHLINE" />
            <Discipline variant="SPEED_SHORT" />
            <Discipline variant="FREESTYLE_HIGHLINE" />
            <Discipline variant="TRICKLINE" />
            <Discipline variant="RIGGING" />
          </div>
          <div className="stack gap-4">
            <strong>Age Category</strong>
            <AgeCategory variant="YOUTH_U14" />
            <AgeCategory variant="YOUTH_U16" />
            <AgeCategory variant="SENIOR" />
            <AgeCategory variant="AMATEUR" />
            <AgeCategory variant="PROFESSIONAL" />
          </div>
          <div className="stack gap-4">
            <strong>Role</strong>
            <Role variant="ATHLETE" />
            <Role variant="ISA_VERIFIED" />
            <Role variant="JUDGE" />
            <Role variant="ORGANIZER" />
          </div>
          <div className="stack gap-4">
            <strong>Gender</strong>
            <Gender variant="FEMALE" />
            <Gender variant="MALE" />
          </div>
          <div className="stack gap-4">
            <Badge color="NEUTRAL">NEUTRAL</Badge>
            <Badge color="BLUE">BLUE</Badge>
            <Badge color="GREEN">GREEN</Badge>
            <Badge color="ORANGE">ORANGE</Badge>
            <Badge color="PINK">PINK</Badge>
            <Badge color="RED">RED</Badge>
            <Badge color="TEAL">TEAL</Badge>
            <Badge color="VIOLET">VIOLET</Badge>
            <Badge color="YELLOW">YELLOW</Badge>
            <Badge color="PURPLE">PURPLE</Badge>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}