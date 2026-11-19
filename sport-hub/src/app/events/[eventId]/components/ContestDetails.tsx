'use client';
import Link from 'next/link';

import { useState } from 'react';
import ResultsTable from './ResultsTable';
import { ContestTabGroup, type ContestJudge, type ContestResult, type ContestTabData } from './ContestTabGroup';
import { ContestAbout } from './ContestAbout';
import { Button, EmptyState } from '@slacklineinternational/onsight/react';

export type { ContestJudge, ContestResult, ContestTabData };

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
  const contest = contests[activeTab] ?? contests[0];

  if (!contest) {
    return (
      <EmptyState title="No contests for this event">
        Contests added to this event will show up here.
      </EmptyState>
    );
  }

  const emailHref = `mailto:info@slacklineinternational.org`
    + `?subject=SportHub message for event: ${eventName} (${eventId})`
    + `&body=This message is about the event ${eventName} (${eventId})`;

  return (
    <section>
      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">Contests</h3>
        <ContestTabGroup
          contests={contests}
          onChange={(tabId: string) => setActiveTab(Number(tabId))}
          value={String(activeTab)}
        />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-4">
        <h3 className="mb-2">About</h3>
        <ContestAbout contest={contest} />
      </div>

      <div className="flex flex-row flex-wrap justify-between items-center">
        <h3 className="mb-2">Results</h3>
        <div className="flex flex-row gap-2 mb-2">
          {isAdmin && (
            <Button
              as={Link}
              href={`/events/my-events/${eventId}/edit`}
              variant="danger-secondary"
              size="small"
            >
              Edit Event
            </Button>
          )}
          <Button
            as={Link}
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
        <EmptyState title="No results yet" titleAs="h4" plain>
          Results show up here once they are recorded.
        </EmptyState>
      )}
    </section>
  );
}
