'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import Link from 'next/link';
import Button from '@ui/Button';
import { Judges } from '../../../submit/components/contest-inputs/Judges';
import { Results } from '../../../submit/components/contest-inputs/Results';
import { updateEventScores } from '../../../submit/actions';
import { EventSubmissionFormValues, ContestFormValues } from '../../../submit/types';
import { cn } from '@utils/cn';
import styles from '../../../submit/components/styles.module.css';
import Spinner from '@ui/Spinner';

type Props = {
  eventId: string;
  eventName: string;
  initialValues: EventSubmissionFormValues;
};

export default function EditScoresClient({ eventId, eventName, initialValues }: Props) {
  const [saved, setSaved] = useState(false);
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
      setSaved(true);
    }).catch(() => {
      alert('Failed to save changes. Please try again.');
    }).finally(() => {
      setSubmitting(false);
    });

  if (saved) {
    return (
      <div className="stack gap-4 p-4 sm:p-0">
        <p className="text-sm text-gray-600">Judges and scores saved.</p>
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
      onSubmit={handleSubmit}
    >
      {({ isSubmitting, values }) => (
        <Form className={cn(styles.formWrapper, 'stack gap-8 p-4 sm:p-0')}>
          <p className="text-sm text-gray-500">
            Editing judges and scores for <strong>{eventName}</strong>.
            Contest settings cannot be changed here.
          </p>

          {values.contests.map((contest: ContestFormValues, idx: number) => {
            const contestKey = `contests[${idx}]`;
            const label = [contest.discipline, contest.gender, contest.ageCategory]
              .filter(Boolean).join(' · ');
            return (
              <section key={idx} className="stack gap-6 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm text-gray-700">
                  Contest {idx + 1}{label ? ` — ${label}` : ''}
                </h3>
                <Judges
                  contestKey={contestKey}
                  judges={contest.judges || []}
                />
                <Results
                  contestKey={contestKey}
                  results={contest.results || []}
                />
              </section>
            );
          })}

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
