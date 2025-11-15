'use client';
import * as Yup from 'yup';
import { useState } from 'react';
import { Formik, Form } from 'formik';
import { TabGroup } from '@ui/Tab';
import Button from '@ui/Button';
import EventForm from './/EventForm';
import {
  initialEventValues,
  eventValidationSchema,
  EventSubmissionFormValues,
} from '../types';
import styles from '../styles.module.css';
import { saveEvent } from '../actions';

const eventSubmissionValidationSchema = Yup.object({
  event: eventValidationSchema,
});

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

          {/* Validation feedback */}
          {dirty && !isValid && (
            <div className={styles.validationHint}>
              Please fix the errors above before submitting
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}
