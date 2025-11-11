'use client';
// import { auth } from "@lib/auth"
import * as Yup from 'yup';
import { useState } from 'react';
import { Formik, Form } from 'formik';
import PageLayout from '@ui/PageLayout';
import { TabGroup } from '@ui/Tab';
import Button from '@ui/Button';
import EventForm from './components/EventForm';
import {
  initialEventValues,
  eventValidationSchema,
} from './types';
import styles from './styles.module.css';
import { cn } from "@utils/cn";

export const eventSubmissionValidationSchema = Yup.object({
  event: eventValidationSchema,
  // contests: Yup.array()
  //   .of(contestValidationSchema)
  //   .min(1, 'Please add at least one contest'),
});

export default function SubmitEventPage() {
  const [activeTab, setActiveTab] = useState('event');
  // const session = await auth()

  // if (!session) {
  //   redirect("/auth/signin")
  // }


  // const handleSubmit = async (
  //   values: EventSubmissionFormValues,
  //   { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void }
  // ) => {
  //   try {
  //     console.log('Submitting event:', values);

  //     // TODO: Call server action to save to DynamoDB
  //     // await saveEvent(values);

  //     // Simulate API call
  //     await new Promise(resolve => setTimeout(resolve, 1000));

  //     alert('Event submitted successfully!');
  //     resetForm();
  //   } catch (error) {
  //     console.error('Error submitting event:', error);
  //     alert('Failed to submit event. Please try again.');
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };

  return (
    <PageLayout title="Event Submission">
      <div className={cn(styles.submitEventContainer, "stack")}>
        <Formik
          initialValues={{
            event: initialEventValues,
          }}
          validationSchema={eventSubmissionValidationSchema}
          onSubmit={() => {}}
          validateOnChange={false}
          validateOnBlur={true}
        >
          {({ isSubmitting, dirty, isValid }) => (
            <Form className={styles.formWrapper}>
              <TabGroup
                activeTab={activeTab}
                className={styles.borderBottom}
                onTabChange={setActiveTab}
                tabs={[
                  { id: 'event', label: 'Event' },
                  { id: 'contests', label: 'Contests' },
                ]}
                variant="primary"
              />

              {activeTab === 'event' && <EventForm />}
              {activeTab === 'contests' && (
                <i>Coming soon...</i>
              )}

              <div className={styles.formActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
                      window.history.back();
                    }
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !dirty || !isValid}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Event'}
                </Button>
              </div>

              {/* Validation feedback */}
              {dirty && !isValid && (
                <div className={styles.validationHint}>
                  Please fix the errors above before submitting
                </div>
              )}
            </Form>
          )}
        </Formik>
      </div>
    </PageLayout>
  );
}
