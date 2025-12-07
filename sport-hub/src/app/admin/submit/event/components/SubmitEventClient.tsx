'use client';
import * as Yup from 'yup';
import { useState } from 'react';
import { Formik, Form } from 'formik';
import { TabGroup } from '@ui/Tab';
import Button from '@ui/Button';
import EventForm from './/EventForm';
import {
  initialEventValues,
  eventSubmissionValidationSchema,
  EventSubmissionFormValues,
  ContestFormValues,
} from '../types';
import styles from '../styles.module.css';
import { saveEvent } from '../actions';
import { cn } from '@utils/cn';
import { FormikSubmitButton } from '@ui/Form';
import TabbedContestForms from './TabbedContestForms';

export default function SubmitEventClient() {
  const [activeTab, setActiveTab] = useState('event');

  const handleSubmit = (
    values: EventSubmissionFormValues,
    { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void }
  ) =>
    saveEvent(values).then(() => {
      resetForm();
    }).catch((error) => {
      console.error('Error submitting event:', error);
      alert('Failed to submit event. Please try again.');
    }).finally(() => {
      setSubmitting(false);
    });

  return (
    <Formik
      initialValues={{
        event: initialEventValues,
        contests: [] as unknown as ContestFormValues[],
      }}
      validationSchema={eventSubmissionValidationSchema}
      onSubmit={handleSubmit}
      validateOnChange={false}
      validateOnBlur={true}
    >
      {({ isSubmitting, dirty, isValid, setValues }) => (
        <Form className={styles.formWrapper}>
          <TabGroup
            activeTab={activeTab}
            className={styles.borderBottom}
            onTabChange={setActiveTab}
            tabs={[
              { id: 'event', label: 'Step 1: Event Details' },
              { id: 'contests', label: 'Step 2: Add Contests' },
            ]}
            variant="primary"
          />

          {activeTab === 'event' && <EventForm />}
          {activeTab === 'contests' && <TabbedContestForms />}

          {dirty && !isValid && (
            <div className={cn(styles.error, styles.borderTop, "text-right", )}>
              Form has errors: {Object.keys(errors).join(', ')}
            </div>
          )}

          <div className={cn(styles.formActions)}>
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
            {process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setValues({
                    event: {
                      name: 'Sample Event',
                      city: 'Sample City',
                      country: 'US',
                      date: '2024-01-01',
                      website: 'https://sampleevent.com',
                      disciplines: ['RIGGING'],
                      socialMedia: {}
                    },
                    contests: [
                      {
                        discipline: 'RIGGING' as Discipline,
                        gender: 'MALE' as Gender,
                        ageCategory: 'PROFESSIONAL' as AgeCategory,
                        judgingSystem: 'ISA_FREESTYLE' as JudgingSystem,
                        contestSize: 'INTERNATIONAL' as ContestSize,
                        totalPrizeValue: 1000,
                        judges: [""],
                      }
                    ],
                  });
                }}
              >
                Autofill (Dev Only)
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !dirty || !isValid}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Event'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
