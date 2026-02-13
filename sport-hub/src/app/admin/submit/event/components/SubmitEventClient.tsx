'use client';
import { useState } from 'react';
import { Formik, Form, getIn } from 'formik';
import { TabGroup } from '@ui/Tab';
import Button from '@ui/Button';
import EventForm from './event-inputs/EventForm';
import {
  initialEventValues,
  eventSubmissionValidationSchema,
  EventSubmissionFormValues,
  ContestFormValues,
} from '../types';
import styles from './styles.module.css';
import { saveEvent } from '../actions';
import { cn } from '@utils/cn';
import { FormikSubmitButton } from '@ui/Form';
import TabbedContestForms from './contest-inputs/TabbedContestForms';
import { ErrorMessage } from './ErrorMessage';
import { ReviewEventForm } from './ReviewEventForm';

type Step = "EVENT" | "CONTESTS" | "REVIEW";

const stepOrder: Step[] = ["EVENT", "CONTESTS", "REVIEW"] as const;

export default function SubmitEventClient() {
  const [currentStep, setCurrentStep] = useState(0);

  const handleSubmit = (
    values: EventSubmissionFormValues,
    { setSubmitting, resetForm }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void }
  ) =>
    saveEvent(values).then(() => {
      resetForm();
    }).catch((error) => {
      console.error('Error submitting EVENT:', error);
      alert('Failed to submit EVENT. Please try again.');
    }).finally(() => {
      setSubmitting(false);
    });

  const activeTab = stepOrder[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === stepOrder.length - 1;

  return (
    <Formik
      initialValues={{
        event: initialEventValues,
        contests: [] as unknown as ContestFormValues[],
      }}
      validationSchema={eventSubmissionValidationSchema}
      validateOnChange
      validateOnBlur={false}
      onSubmit={handleSubmit}
    >
      {({ errors, isValid, setFieldTouched, validateForm, values }) => {
        const isErrorEvent = Object.keys(errors?.event || {}).length > 0;
        const isErrorContest = (errors?.contests?.length || 0) > 0;

        const tabState = [
          { id: 'EVENT', label: 'Step 1: Event Details' },
          { id: 'CONTESTS', label: 'Step 2: Add Contests', disabled: isErrorEvent },
          { id: 'REVIEW', label: 'Step 3: Review', disabled: isErrorEvent || isErrorContest },
        ];

        return (
          <Form className={cn(styles.formWrapper, "stack")}>
            {/* Form Header */}
            <TabGroup
              activeTab={activeTab}
              className={cn(styles.borderBottom, "mb-2")}
              onTabChange={(tabId) => {
                const newStep = stepOrder.indexOf(tabId as Step);
                setCurrentStep(newStep);
              }}
              tabs={tabState}
              variant="primary"
            />

            {/* Form Content */}
            {activeTab === 'EVENT' && <EventForm />}
            {activeTab === 'CONTESTS' && <TabbedContestForms />}
            {activeTab === 'REVIEW' && <ReviewEventForm />}

            {/*  Validation */}
            {!isValid && (
              <ErrorMessage
                className={cn(styles.borderTop, "justify-end", "gap-1", "pb-4")}
                size="SM"
              >
                Please reviews errors before proceeding.
              </ErrorMessage>
            )}

            {/* Form Footer */}
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
              {!isFirstStep && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  type="button"
                  variant="secondary"
                >
                  Previous
                </Button>
              )}
              {!isLastStep && (
                <Button
                  onClick={async () => {
                    const currentErrors = await validateForm();
                    const eventErrors = getIn(currentErrors, 'event') || {};
                    const contestsErrors = getIn(currentErrors, 'contests') || [];
                    const hasErrors =
                      activeTab === 'EVENT'
                        ? Object.keys(eventErrors).length > 0
                        : Array.isArray(contestsErrors) && contestsErrors.some(e => e && Object.keys(e).length > 0);

                    if (hasErrors) {
                      // mark section touched so messages render
                      if (activeTab === 'EVENT') {
                        Object.keys(initialEventValues).forEach((key) =>
                          setFieldTouched(`event.${key}`, true, true)
                        );
                      } else {
                        (values.contests || []).forEach((_, idx) =>
                          setFieldTouched(`contests[${idx}]`, true, true)
                        );
                      }
                      return; // prevent advancing
                    }

                    setCurrentStep(currentStep + 1);
                  }}
                  type="button"
                  variant="primary"
                >
                  Next
                </Button>
              )}
              {isLastStep && <FormikSubmitButton />}
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
