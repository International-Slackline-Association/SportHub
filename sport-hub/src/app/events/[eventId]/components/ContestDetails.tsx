'use client';

import { useState } from 'react';
import ResultsTable from './ResultsTable';
import { Alert } from '@ui/Alert';
import { ContestRecord } from '@lib/relational-types';
import { ContestTabGroup } from './ContestTabGroup';
import { ContestAbout } from './ContestAbout';
import Button from '@ui/Button';

export type ContestJudge = {
  id?: string;
  name: string;
  isPending: boolean;
};

export type ContestResult = {
  rank: number;
  id?: string;
  name: string;
  isaPoints: number;
  isPending: boolean;
};

export type ContestTabData = ContestRecord & {
  results: ContestResult[];
};

export type ContestDetailsProps = {
  contests: ContestTabData[];
  eventId: string;
  eventName: string;
  initialTab?: number;
  isAdmin?: boolean;
};

export default function ContestDetails({
  contests,
  eventId,
  eventName,
  isAdmin = false,
  initialTab = 0
}: ContestDetailsProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const contest = contests[activeTab];

  if (!contests.length) {
    return <Alert variant="info">No contests available for this event.</Alert>;
  }

  const emailHref = `mailto:info@slacklineinternational.org`
    + `?subject=SportHub message for event: ${eventName} (${eventId})`
    + `&body=This message is about the event ${eventName} (${eventId})`;

  return (
    <section>
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">Contests</h3>
        <ContestTabGroup
          activeTab={String(activeTab)}
          onTabChange={(tabId: string) => setActiveTab(Number(tabId))}
          contests={contests}
          variant="secondary"
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">About</h3>
        <ContestAbout contest={contest} />
      </div>

      <div className="flex flex-row justify-between items-center">
        <h3 className="mb-2">Results</h3>
        <div className="flex flex-row gap-2 mb-2">
          {isAdmin && (
            <Button
              as="link"
              href={`/events/my-events/${eventId}/edit`}
              variant="destructive-secondary"
              size="small"
            >
              Edit Event
            </Button>
          )}
          <Button
            as="link"
            href={emailHref}
            variant="secondary"
            size="small"
          >
            Email about this event
          </Button>
        </div>
      </div>
      {contest?.results?.length > 0 ? (
        <ResultsTable
          data={contest.results.map(result => ({
            userId: result.id ?? '',
            name: result.name,
            place: String(result.rank),
            points: result.isaPoints,
          }))}
        />
      ) : (
        <Alert variant="info">No results available at this time.</Alert>
      )}
    </section>
  );
}
