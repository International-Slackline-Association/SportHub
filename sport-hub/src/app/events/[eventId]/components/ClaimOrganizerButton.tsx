'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestOrganizerClaim } from '../../submit/organizer-claims-actions';

type Props = {
  eventId: string;
  initialPending: boolean;
};

export default function ClaimOrganizerButton({ eventId, initialPending }: Props) {
  const [pending, setPending] = useState(initialPending);
  const [granted, setGranted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    setIsSubmitting(true);
    setError(null);
    requestOrganizerClaim(eventId).then((result) => {
      if (!result.success) {
        setError(result.error || 'Failed to submit claim. Please try again.');
        return;
      }
      if (result.message?.startsWith('You have been added')) {
        setGranted(true);
      } else {
        setPending(true);
      }
      router.refresh(); // reconcile server-rendered organizer/claim state
    }).catch(() => {
      setError('Failed to submit claim. Please try again.');
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  if (granted) {
    return (
      <span className="inline-block text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded">
        You have been added as organizer
      </span>
    );
  }

  if (pending) {
    return (
      <span className="inline-block text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
        Claim pending admin review
      </span>
    );
  }

  return (
    <div className="stack gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-fit"
      >
        {isSubmitting ? 'Submitting…' : 'Claim this event as organizer'}
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
