'use client';
import { useState } from 'react';
import { Formik, Form, getIn } from 'formik';
import Link from 'next/link';
import { TabGroup } from '@ui/Tab';
import Button from '@ui/Button';
import EventForm from '../../../submit/components/event-inputs/EventForm';
import {
  initialEventValues,
  eventSubmissionValidationSchema,
  EventSubmissionFormValues,
} from '../../../submit/types';
import styles from '../../../submit/components/styles.module.css';
import { updateEvent } from '../../../submit/actions';
import { cn } from '@utils/cn';
import TabbedContestForms from '../../../submit/components/contest-inputs/TabbedContestForms';
import { ErrorMessage } from '../../../submit/components/ErrorMessage';
import { ReviewEventForm } from '../../../submit/components/ReviewEventForm';
import Spinner from '@ui/Spinner';

type Step = 'EVENT' | 'CONTESTS' | 'REVIEW';
const stepOrder: Step[] = ['EVENT', 'CONTESTS', 'REVIEW'];

type Props = {
  eventId: string;
  initialValues: EventSubmissionFormValues;
};

export default function EditEventClient({ eventId, initialValues }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  const handleSubmit = (
    values: EventSubmissionFormValues,
    { setSubmitting }: { setSubmitting: (b: boolean) => void }
  ) =>
    updateEvent(eventId, values).then((result) => {
      if (!result.success) {
        alert(result.error || 'Failed to save changes. Please try again.');
        return;
      }
      setSaved(true);
    }).catch((error) => {
      console.error('Error updating event:', error);
      alert('Failed to save changes. Please try again.');
    }).finally(() => {
      setSubmitting(false);
    });

  const activeTab = stepOrder[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === stepOrder.length - 1;

  if (saved) {
    return (
      <div className={cn(styles.formWrapper, 'stack gap-6 items-start p-4 sm:p-0')}>
        <div className="stack gap-2">
          <h2 className="text-xl font-semibold">Changes saved</h2>
          <p className="text-sm text-gray-600">Your event has been updated.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/events/my-events">
            <Button type="button" variant="primary">Back to My Events</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => setSaved(false)}>
            Keep editing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={eventSubmissionValidationSchema}
      validateOnChange={true}
      validateOnBlur={false}
      onSubmit={handleSubmit}
    >
      {({ errors, isValid, dirty, isSubmitting, setFieldTouched, validateForm, values }) => {
        const isErrorEvent = Object.keys(errors?.event || {}).length > 0;
        const isErrorContest = (errors?.contests?.length || 0) > 0;

        const tabState = [
          { id: 'EVENT', label: 'Step 1: Event Details' },
          { id: 'CONTESTS', label: 'Step 2: Contests', disabled: isErrorEvent },
          { id: 'REVIEW', label: 'Step 3: Review', disabled: isErrorEvent || isErrorContest },
        ];

        const submitDisabled = isSubmitting || !isValid || !dirty;

        return (
          <Form className={cn(styles.formWrapper, 'stack')}>
            <TabGroup
              activeTab={activeTab}
              className={cn(styles.borderBottom, 'mb-2')}
              onTabChange={(tabId) => setCurrentStep(stepOrder.indexOf(tabId as Step))}
              tabs={tabState}
              variant="primary"
            />

            {activeTab === 'EVENT' && <EventForm />}
            {activeTab === 'CONTESTS' && <TabbedContestForms />}
            {activeTab === 'REVIEW' && <ReviewEventForm />}

            {hasValidated && !isValid && (
              <ErrorMessage
                className={cn(styles.borderTop, 'justify-end', 'gap-1', 'pb-4')}
                size="SM"
              >
                Please review errors before proceeding.
              </ErrorMessage>
            )}

            <div className={cn(styles.formActions)}>
              <Link href="/events/my-events">
                <Button type="button" variant="ghost">Cancel</Button>
              </Link>
              {!isFirstStep && (
                <Button
                  onClick={() => { setCurrentStep(currentStep - 1); setHasValidated(false); }}
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
                      return;
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
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitDisabled}
                >
                  {isSubmitting && <Spinner size="small" color="white" />}
                  Save Changes
                </Button>
              )}
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
