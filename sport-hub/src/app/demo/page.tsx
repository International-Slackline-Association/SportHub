"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import Button from "@ui/Button";
import { AgeCategory, Badge, ContestSize, Discipline, Gender, Role } from "@ui/Badge";
import PageLayout from "@ui/PageLayout";
import Modal from "@ui/Modal";
import { TabGroup } from "@ui/Tab";
import { FormikCheckboxField, FormikCheckboxGroup, FormikRadioGroup, FormikSelectField, FormikSubmitButton, FormikTextField } from "@ui/Form";

export default function Page() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("rankings");

  // Form validation schema for the demo
  const formValidationSchema = Yup.object({
    eventName: Yup.string().required("Event name is required"),
    city: Yup.string().required("City is required"),
    country: Yup.string().required("Please select a country"),
    verified: Yup.boolean(),
    disciplines: Yup.array()
      .min(1, "Please select at least one discipline")
      .required("Please select at least one discipline"),
    level: Yup.string(),
  });

  // Initial form values
  const initialFormValues = {
    eventName: "",
    city: "",
    country: "",
    verified: false,
    disciplines: [],
    level: "1",
  };

  const handleFormSubmit = (values: typeof initialFormValues) => {
    console.log("Demo form submitted:", values);
    alert("Form submitted! Check console for values.");
  };

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
      <section className="p-4 sm:p-0">
        <h2>Form Fields</h2>
        <div className="max-w-2xl">
          <Formik
            initialValues={initialFormValues}
            validationSchema={formValidationSchema}
            onSubmit={handleFormSubmit}
          >
            {() => (
              <Form className="stack gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormikTextField
                    id="eventName"
                    placeholder="Laax"
                  />
                  <FormikTextField
                    id="city"
                    placeholder="Laax"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormikSelectField
                    id="country"
                    placeholder="Swiss"
                    options={[
                      { value: "CH", label: "Switzerland" },
                      { value: "US", label: "United States" },
                      { value: "DE", label: "Germany" },
                      { value: "FR", label: "France" },
                      { value: "IT", label: "Italy" },
                    ]}
                  />
                  <FormikCheckboxField id="verified" label="ISA Verified" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormikCheckboxGroup
                    direction="row"
                    id="disciplines"
                    label="Disciplines"
                    options={[
                      { label: "A", value: "a" },
                      { label: "B", value: "b" },
                      { label: "C", value: "c" },
                      { label: "D", value: "d" }
                    ]}
                  />
                  <FormikRadioGroup
                    id="level"
                    label="Level"
                    options={[
                      { label: "1", value: "1" },
                      { label: "2", value: "2" },
                      { label: "3", value: "3" },
                      { label: "4", value: "4" }
                    ]}
                  />
                </div>
                <div className="flex gap-4">
                  <FormikSubmitButton />
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </section>
    </PageLayout>
  );
}