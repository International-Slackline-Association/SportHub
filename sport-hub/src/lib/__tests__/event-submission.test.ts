/**
 * Unit tests for the event submission flow: submit, edit event, edit scores.
 * Run with: pnpm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  editEventPermissionError,
  isDateInPast,
  pastEventRequirementsError,
  scoreEditMessage,
  scoreEditMode,
  withServerPoints,
} from '../event-submission';
import { eventSubmissionValidationSchema, type ContestFormValues, type EventSubmissionFormValues } from '../../app/events/submit/types';
import { getContestSortKey, isPublishedEventStatus, transformContestFormToRecord } from '../event-contest-service';

const TODAY = new Date('2026-06-15T12:00:00');

const contest = (overrides: Partial<ContestFormValues> = {}): ContestFormValues => ({
  contestId: 'c1',
  startDate: '2026-06-01',
  endDate: '2026-06-02',
  discipline: 'TRICKLINE_AERIAL',
  gender: 'MEN' as ContestFormValues['gender'],
  ageCategory: 'ALL' as ContestFormValues['ageCategory'],
  judgingSystem: '' as ContestFormValues['judgingSystem'],
  contestSize: 'CHALLENGE' as ContestFormValues['contestSize'],
  judges: [{ userId: 'j1', name: 'Judge One' }],
  results: [{ id: 'a1', name: 'Athlete One', rank: 1, isaPoints: 200, isPending: false }],
  ...overrides,
} as ContestFormValues);

const submission = (startDate: string, contests: ContestFormValues[]): EventSubmissionFormValues => ({
  event: {
    eventName: 'Test Games',
    city: 'Berlin',
    country: 'DE',
    startDate,
    endDate: startDate,
    website: 'https://example.org',
    links: [],
  },
  contests,
});

/* Past-event rule ----------------------------------------------------------- */

test('a day before today is in the past, today and later are not', () => {
  assert.equal(isDateInPast('2026-06-14', TODAY), true);
  assert.equal(isDateInPast('2026-06-15', TODAY), false);
  assert.equal(isDateInPast('2026-06-16', TODAY), false);
  assert.equal(isDateInPast(undefined, TODAY), false);
});

test('a future event needs no judges or results', () => {
  const values = submission('2026-07-01', [contest({ judges: [], results: [] })]);
  assert.equal(pastEventRequirementsError(values, TODAY), null);
});

test('a past event needs judges in every contest', () => {
  const values = submission('2026-06-01', [contest(), contest({ contestId: 'c2', judges: [] })]);
  assert.match(pastEventRequirementsError(values, TODAY) ?? '', /Judges are required/);
});

test('a past event needs results in every contest', () => {
  const values = submission('2026-06-01', [contest({ results: [] })]);
  assert.match(pastEventRequirementsError(values, TODAY) ?? '', /Results are required/);
});

test('a past event with judges and results passes', () => {
  assert.equal(pastEventRequirementsError(submission('2026-06-01', [contest()]), TODAY), null);
});

/* Points -------------------------------------------------------------------- */

test('organizer points are recalculated from rank and contest size', () => {
  const [c] = withServerPoints([contest({
    results: [
      { id: 'a1', name: 'A', rank: 1, isaPoints: 9999, isPending: false },
      { id: 'a2', name: 'B', rank: 2, isaPoints: 9999, isPending: false },
      { id: 'a3', name: 'C', rank: 3, isaPoints: 9999, isPending: false },
    ],
  })], false);
  assert.deepEqual(c.results?.map((r) => r.isaPoints), [200, 167, 139]);
});

test('tied ranks get equal points', () => {
  const [c] = withServerPoints([contest({
    contestSize: 'OPEN' as ContestFormValues['contestSize'],
    results: [
      { id: 'a1', name: 'A', rank: 1, isaPoints: 0, isPending: false },
      { id: 'a2', name: 'B', rank: 1, isaPoints: 0, isPending: false },
      { id: 'a3', name: 'C', rank: 3, isaPoints: 0, isPending: false },
    ],
  })], false);
  assert.deepEqual(c.results?.map((r) => r.isaPoints), [300, 300, 208]);
});

test('admin points are kept as entered', () => {
  const [c] = withServerPoints([contest({ results: [{ id: 'a1', name: 'A', rank: 1, isaPoints: 123, isPending: false }] })], true);
  assert.equal(c.results?.[0].isaPoints, 123);
});

test('contests without a size or results are left unchanged', () => {
  const noSize = contest({ contestSize: '' as ContestFormValues['contestSize'] });
  assert.deepEqual(withServerPoints([noSize], false), [noSize]);
  const noResults = contest({ results: undefined });
  assert.deepEqual(withServerPoints([noResults], false), [noResults]);
});

/* Edit event ---------------------------------------------------------------- */

test('admins may edit any event', () => {
  assert.equal(editEventPermissionError({ isAdmin: true, isCreator: false, status: 'published' }), null);
});

test('organizers may edit their own draft or pending event', () => {
  assert.equal(editEventPermissionError({ isAdmin: false, isCreator: true, status: 'draft' }), null);
  assert.equal(editEventPermissionError({ isAdmin: false, isCreator: true, status: 'pending' }), null);
});

test('organizers may not edit their approved, cancelled or legacy event', () => {
  for (const status of ['published', 'cancelled', undefined]) {
    assert.match(editEventPermissionError({ isAdmin: false, isCreator: true, status }) ?? '', /Edit scores/);
  }
});

test('nobody but the creator or an admin may edit an event', () => {
  assert.match(editEventPermissionError({ isAdmin: false, isCreator: false, status: 'draft' }) ?? '', /permission/);
});

/* Edit scores --------------------------------------------------------------- */

test('first judges or results of a contest are applied directly', () => {
  assert.equal(scoreEditMode({ judges: [], results: [] }, false), 'apply');
  assert.equal(scoreEditMode({}, false), 'apply');
});

test('an organizer changing existing results is staged for review', () => {
  assert.equal(scoreEditMode({ results: [{}] }, false), 'stage');
  assert.equal(scoreEditMode({ judges: [{}] }, false), 'stage');
});

test('an admin change is always applied', () => {
  assert.equal(scoreEditMode({ results: [{}], judges: [{}] }, true), 'apply');
});

test('the edit scores message says what was saved and what is in review', () => {
  assert.equal(scoreEditMessage(2, 0), 'Judges and scores saved.');
  assert.match(scoreEditMessage(0, 1), /submitted for admin review/);
  assert.equal(scoreEditMessage(1, 2), 'Judges and scores saved for 1 contest; 2 contests submitted for admin review.');
});

/* Form schema --------------------------------------------------------------- */

test('a complete submission passes the form schema', async () => {
  await eventSubmissionValidationSchema.validate(submission('2026-06-01', [contest()]), { abortEarly: false });
});

const schemaErrors = async (values: unknown): Promise<string[]> => {
  try {
    await eventSubmissionValidationSchema.validate(values, { abortEarly: false });
    return [];
  } catch (error) {
    return (error as { errors: string[] }).errors;
  }
};

test('the form schema rejects a contest ending before it starts', async () => {
  const errors = await schemaErrors(submission('2026-06-01', [contest({ startDate: '2026-06-03', endDate: '2026-06-02' })]));
  assert.ok(errors.some((e) => /end date/i.test(e)), errors.join('; '));
});

test('the form schema requires a contest size', async () => {
  const errors = await schemaErrors(submission('2026-06-01', [contest({ contestSize: '' as ContestFormValues['contestSize'] })]));
  assert.ok(errors.includes('Contest size is required'), errors.join('; '));
});

test('the form schema rejects duplicate judges', async () => {
  const errors = await schemaErrors(submission('2026-06-01', [contest({ judges: [{ id: 'j1', name: 'A' }, { id: 'j1', name: 'A' }] as unknown as ContestFormValues['judges'] })]));
  assert.ok(errors.some((e) => /Duplicate judges/.test(e)), errors.join('; '));
});

test('the form schema rejects a rank below 1', async () => {
  const errors = await schemaErrors(submission('2026-06-01', [contest({ results: [{ id: 'a1', name: 'A', rank: 0, isaPoints: 0, isPending: false }] })]));
  assert.ok(errors.includes('Rank must be at least 1'), errors.join('; '));
});

/* Saved records ------------------------------------------------------------- */

test('a contest is stored under Contest:{discipline number}:{contestId}', () => {
  assert.equal(getContestSortKey(contest()), 'Contest:2:c1');
  const record = transformContestFormToRecord(contest(), 'event-1', 0);
  assert.equal(record.eventId, 'event-1');
  assert.equal(record.sortKey, 'Contest:2:c1');
  assert.equal(record.results?.[0].id, 'a1');
});

test('legacy events without a status count as published', () => {
  assert.equal(isPublishedEventStatus(undefined), true);
  assert.equal(isPublishedEventStatus('published'), true);
  assert.equal(isPublishedEventStatus('pending'), false);
  assert.equal(isPublishedEventStatus('draft'), false);
  assert.equal(isPublishedEventStatus('cancelled'), false);
});
