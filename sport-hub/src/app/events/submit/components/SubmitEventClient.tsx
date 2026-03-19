'use client';
import { useRef, useState } from 'react';
import { Formik, Form, getIn } from 'formik';
import Link from 'next/link';
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
import TabbedContestForms from './contest-inputs/TabbedContestForms';
import { Alert } from '../../../../ui/Alert';
import { ReviewEventForm } from './ReviewEventForm';
import Spinner from '@ui/Spinner';

type Step = "EVENT" | "CONTESTS" | "REVIEW";
type SubmitIntent = 'draft' | 'pending';

const stepOrder: Step[] = ["EVENT", "CONTESTS", "REVIEW"] as const;

export default function SubmitEventClient() {
  const [currentStep, setCurrentStep] = useState(0);
  const [submittedStatus, setSubmittedStatus] = useState<SubmitIntent | null>(null);
  const [hasValidated, setHasValidated] = useState(false);
  const submitIntentRef = useRef<SubmitIntent>('draft');

  const handleSubmit = (
    values: EventSubmissionFormValues,
    { setSubmitting }: { setSubmitting: (isSubmitting: boolean) => void; resetForm: () => void }
  ) =>
    saveEvent(values, submitIntentRef.current).then((result) => {
      if (!result.success) {
        alert(result.error || 'Failed to save event. Please try again.');
        return;
      }
      setSubmittedStatus(submitIntentRef.current);
    }).catch((error) => {
      console.error('Error submitting event:', error);
      alert('Failed to submit event. Please try again.');
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
      validateOnChange={true}
      validateOnBlur={false}
      onSubmit={handleSubmit}
    >
      {({ errors, isValid, dirty, isSubmitting, setFieldTouched, validateForm, values, resetForm }) => {
        const isErrorEvent = Object.keys(errors?.event || {}).length > 0;
        const isErrorContest = (errors?.contests?.length || 0) > 0;

        const tabState = [
          { id: 'EVENT', label: 'Step 1: Event Details' },
          { id: 'CONTESTS', label: 'Step 2: Contests', disabled: isErrorEvent },
          { id: 'REVIEW', label: 'Step 3: Review', disabled: isErrorEvent || isErrorContest },
        ];

        if (submittedStatus) {
          const isDraft = submittedStatus === 'draft';
          return (
            <div className={cn(styles.formWrapper, "stack gap-6 items-start p-4 sm:p-0")}>
              <div className="stack gap-2">
                <h2 className="text-xl font-semibold">
                  {isDraft ? 'Event saved as draft' : 'Event submitted for approval'}
                </h2>
                <p className="text-sm text-gray-600">
                  {isDraft
                    ? <>Your event has been saved as a draft. Go to{" "}
                        <Link href="/events/my-events" className="underline font-medium">My Events</Link>
                        {" "}to submit it for admin approval when ready.</>
                    : <>Your event has been submitted and is pending admin approval. Go to{" "}
                        <Link href="/events/my-events" className="underline font-medium">My Events</Link>
                        {" "}to track its status.</>
                  }
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/events/my-events">
                  <Button type="button" variant="primary">Go to My Events</Button>
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetForm();
                    setSubmittedStatus(null);
                    setCurrentStep(0);
                  }}
                >
                  Submit another event
                </Button>
              </div>
            </div>
          );
        }

        const submitDisabled = isSubmitting || !isValid || !dirty;

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
            {hasValidated && !isValid && (
              <Alert
                className={cn(styles.borderTop, "justify-end", "gap-1", "pb-4")}
                size="SM"
              >
                Please review errors before proceeding.
              </Alert>
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
                  onClick={() => {
                    setCurrentStep(currentStep - 1);
                    setHasValidated(false);
                  }}
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
                      setHasValidated(true);
                      // mark section fields as touched so error messages render
                      if (activeTab === 'EVENT') {
                        Object.keys(initialEventValues).forEach((key) =>
                          setFieldTouched(`event.${key}`, true, false)
                        );
                      } else {
                        (values.contests || []).forEach((contest, idx) =>
                          Object.keys(contest).forEach((key) =>
                            setFieldTouched(`contests[${idx}].${key}`, true, false)
                          )
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
              {isLastStep && (
                <>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={submitDisabled}
                    onClick={() => { submitIntentRef.current = 'draft'; }}
                  >
                    {isSubmitting && submitIntentRef.current === 'draft' && <Spinner size="small" color="white" />}
                    Save as Draft
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitDisabled}
                    onClick={() => { submitIntentRef.current = 'pending'; }}
                  >
                    {isSubmitting && submitIntentRef.current === 'pending' && <Spinner size="small" color="white" />}
                    Submit for Approval
                  </Button>
                </>
              )}
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
