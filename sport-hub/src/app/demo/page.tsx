"use client";

import { useState } from "react";
import Button from "@ui/Button";
import { AgeCategory, Badge, ContestSize, Discipline, Gender, Role } from "@ui/Badge";
import PageLayout from "@ui/PageLayout";
import Modal from "@ui/Modal";
import { TabGroup } from "@ui/Tab";

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rankings");

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
      <section>
        <h2>Modal</h2>
        <div className="flex flex-row gap-4">
          <Button 
            variant="primary" 
            onClick={() => setIsModalOpen(true)}
          >
            Open Modal
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Welcome to This New Feature"
            actions={
              <>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                  Save
                </Button>
              </>
            }
          >
            Used for multiline pieces of content. Lorem ipsum dolor sit amet, ex lucilius hendrerit vim, tempor scaevola iudicabit ei ius, te eum illud impetus antiopam. Eu wisi commune volutpat pro, usu at alii magna aperiam.
          </Modal>
        </div>
      </section>
      <section>
        <h2>Tabs</h2>
        <div className="stack gap-8">
          <div className="stack gap-4">
            <strong>Primary Tabs</strong>
            <TabGroup
              tabs={[
                { id: "rankings", label: "Rankings" },
                { id: "events", label: "Events" },
                { id: "athletes", label: "Athletes" },
                { id: "judges", label: "Judges" }
              ]}
              variant="primary"
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          <div className="stack gap-4">
            <strong>Large Tabs</strong>
            <TabGroup
              tabs={[
                { id: "rankings", label: "Rankings" },
                { id: "events", label: "Events" },
                { id: "judges", label: "Judges and Scoring" },
                { id: "records", label: "World Records" },
                { id: "admin", label: "Admin" }
              ]}
              variant="large"
            />
          </div>
          <div className="stack gap-4">
            <strong>Secondary Tabs</strong>
            <TabGroup
              tabs={[
                { id: "nav1", label: "Nav Item" },
                { id: "nav2", label: "Nav Item" },
                { id: "nav3", label: "Nav Item" },
                { id: "nav4", label: "Nav Item" }
              ]}
              variant="secondary"
            />
          </div>
        </div>
      </section>
    </PageLayout>
  );
}