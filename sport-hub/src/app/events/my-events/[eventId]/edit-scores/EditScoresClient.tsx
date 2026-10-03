'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import Link from 'next/link';
import Button from '@ui/Button';
import TabbedContestForms from '../../../submit/components/contest-inputs/TabbedContestForms';
import { updateEventScores } from '../../../submit/actions';
import { EventSubmissionFormValues } from '../../../submit/types';
import { cn } from '@utils/cn';
import styles from '../../../submit/components/styles.module.css';
import Spinner from '@ui/Spinner';

type Props = {
  eventId: string;
  eventName: string;
  initialValues: EventSubmissionFormValues;
};

export default function EditScoresClient({ eventId, eventName, initialValues }: Props) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (
    values: EventSubmissionFormValues,
    { setSubmitting }: { setSubmitting: (b: boolean) => void }
  ) =>
    updateEventScores(eventId, values.contests).then((result) => {
      if (!result.success) {
        alert(result.error || 'Failed to save changes. Please try again.');
        return;
      }
      router.refresh(); // clear client router cache so /events shows updated data immediately
      setSavedMessage(result.message || 'Judges and scores saved.');
    }).catch(() => {
      alert('Failed to save changes. Please try again.');
    }).finally(() => {
      setSubmitting(false);
    });

  if (savedMessage) {
    return (
      <div className="stack gap-4 p-4 sm:p-0">
        <p className="text-sm text-gray-600">{savedMessage}</p>
        <div className="flex gap-3">
          <Link href="/events/my-events">
            <Button type="button" variant="primary">Back to My Events</Button>
          </Link>
          <Button type="button" variant="secondary" onClick={() => setSavedMessage(null)}>
            Keep editing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting }) => (
        <Form className={cn(styles.formWrapper, 'stack p-4 sm:p-0')}>
          <TabbedContestForms
            showContestActions={false}
            showGeneralInfoTab={false}
          />
          <div className={cn(styles.formActions)}>
            <Link href="/events/my-events">
              <Button type="button" variant="ghost">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting && <Spinner size="small" color="white" />}
              Save Judges &amp; Scores
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
