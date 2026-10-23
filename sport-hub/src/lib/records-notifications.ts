/**
 * Emails for record and first claims (requirements §7.7): the athletes and the
 * claimant on every status change, the records team on submission and the
 * communication team on approval.
 */

import { getRecordCategory } from './records-service';
import { formatEntryDate, formatRecordValue, LIST_LABELS } from './records-logic';
import { getUser } from './user-service';
import { sendMail, siteUrl } from './mailer';
import { getCountryByCode } from '@utils/countries';
import type { RecordEntryRecord, WorldEntryRecord } from './relational-types';

export type ClaimEvent = 'submitted' | 'approved' | 'changes_requested' | 'rejected';

export interface ClaimEventContext {
  comment?: string;
  supersedes?: RecordEntryRecord[];   // Records this approval made historical
}

const reviewTeam = () => process.env.RECORDS_REVIEW_EMAIL || 'records@slacklineinternational.org';
const communicationTeam = () => process.env.RECORDS_COMMUNICATION_EMAIL || 'communication@slacklineinternational.org';

async function athleteEmails(entry: WorldEntryRecord): Promise<string[]> {
  const ids = [...new Set([entry.claimantUserId, ...entry.athletes.map(a => a.userId)].filter((id): id is string => !!id))];
  const profiles = await Promise.all(ids.map(id => getUser(id).catch(() => null)));
  return [
    ...profiles.map(p => p?.email).filter((e): e is string => !!e),
    ...entry.athletes.map(a => a.pendingUser?.email).filter((e): e is string => !!e),
  ];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const country = (code?: string) => (code && getCountryByCode(code)?.name) || code?.toUpperCase();

/** Witnesses whose contact is an email address (it can also be a phone number). */
const witnessEmails = (entry: WorldEntryRecord) =>
  entry.kind === 'record' ? entry.witnesses.map(w => w.contact.trim()).filter(c => EMAIL.test(c)) : [];

/** Everything on the claim, for the submission emails. */
function fullDetails(entry: WorldEntryRecord): string[] {
  const lines: string[] = [];
  const add = (label: string, value?: string | false) => { if (value) lines.push(`${label}: ${value}`); };
  if (entry.kind === 'record') {
    if (entry.newCategoryProposal) {
      const p = entry.newCategoryProposal;
      lines.push('', 'Proposed new category:');
      add('  Name', p.name);
      add('  What is measured', p.measurement);
      add('  Unit', `${p.unit}, ${p.direction} is better`);
      add('  Why distinct', p.justification);
    }
    add('Setup', entry.setup);
    add('Further specs', entry.furtherSpecs);
    if (entry.witnesses.length > 0) lines.push('', 'Witnesses:', ...entry.witnesses.map(w => `  ${w.name} (${w.role}), ${w.contact}`));
    add('No full video because', entry.noFullVideoReason);
  } else {
    add('Why it is a first', entry.whyFirst);
    add('Similar tricks', entry.similarTricks);
    add('Line', entry.lineDetails);
    add('In competition', entry.inCompetition ? 'yes' : 'no');
    add('Full control at initiation and termination', entry.controlConfirmed && 'confirmed');
  }
  lines.push('');
  add('Submitted by', entry.claimantName);
  add('Consent of all athletes', entry.consentConfirmed && 'confirmed');
  add('ISA ethics guidelines and Code of Conduct', entry.ethicsConfirmed && 'confirmed');
  return lines;
}

async function summary(entry: WorldEntryRecord): Promise<{ title: string; lines: string[] }> {
  const athletes = entry.athletes.map(a => `${a.name}${a.country ? ` (${country(a.country)})` : ''}`).join(', ');
  const where = [entry.locationName, country(entry.locationCountry)].filter(Boolean).join(', ');
  const lines = [`Athletes: ${athletes}${entry.athletes.length > 1 ? ' (one joint performance)' : ''}`, `List: ${LIST_LABELS[entry.list]}`];
  let title: string;
  if (entry.kind === 'record') {
    const category = entry.categoryId.startsWith('proposed-') ? null : await getRecordCategory(entry.categoryId);
    const value = category ? formatRecordValue(category, entry.value) : entry.value.original ?? '';
    title = `World record: ${entry.categoryName}${entry.newCategoryProposal && !category ? ' (new category)' : ''}, ${value}`;
    lines.unshift(`Category: ${entry.categoryName}`, `Value: ${value}`);
  } else {
    title = `World first: ${entry.trickName} (${entry.categoryName})`;
    lines.unshift(`Discipline: ${entry.categoryName}`, `Trick: ${entry.trickName}`);
    if (entry.description) lines.push(`Description: ${entry.description}`);
  }
  if (entry.date) lines.push(`Date: ${formatEntryDate(entry.date)}`);
  if (where) lines.push(`Location: ${where}`);
  if (entry.evidence.length > 0) lines.push('Evidence:', ...entry.evidence.map(e => `  ${e.url}`));
  return { title, lines };
}

async function superseded(entry: WorldEntryRecord, supersedes: RecordEntryRecord[]): Promise<string[]> {
  if (entry.kind !== 'record' || supersedes.length === 0) return [];
  const category = await getRecordCategory(entry.categoryId);
  return [
    'Previous record:',
    ...supersedes.map(old => `  ${old.athletes.map(a => a.name).join(', ')}: ${category ? formatRecordValue(category, old.value) : old.value.original ?? ''}${old.date ? ` (${formatEntryDate(old.date)})` : ''}`),
  ];
}

/** Never throws: a failed email must not block or roll back the action (FR-31). */
export async function notifyClaimEvent(event: ClaimEvent, entry: WorldEntryRecord, context: ClaimEventContext = {}): Promise<void> {
  try {
    const [{ title, lines }, recipients] = await Promise.all([summary(entry), athleteEmails(entry)]);
    const details = lines.join('\n');
    const myClaims = siteUrl('/world_records/my-claims');
    const mails: Parameters<typeof sendMail>[0][] = [];

    switch (event) {
      case 'submitted': {
        const all = [details, ...fullDetails(entry)].join('\n');
        mails.push({
          to: recipients,
          subject: `ISA received your claim: ${title}`,
          text: `The ISA received this claim and will review it. Please check that everything below is correct; if not, reply to ${reviewTeam()}.\n\n${all}\n\nYou can follow its status on ${myClaims}`,
        });
        mails.push({
          to: witnessEmails(entry),
          subject: `You were named as a witness: ${title}`,
          text: `${entry.claimantName ?? 'An athlete'} submitted this claim to the ISA and named you as a witness. The ISA may contact you to confirm what you saw. If something below is not correct, please write to ${reviewTeam()}.\n\n${all}`,
        });
        mails.push({
          to: [reviewTeam()],
          subject: `New claim to review: ${title}`,
          text: `${entry.claimantName ?? 'Someone'} submitted a claim.\n\n${all}\n\nReview it: ${siteUrl(`/admin/records-review/${entry.kind}/${entry.entryId}`)}`,
        });
        break;
      }
      case 'approved': {
        const previous = await superseded(entry, context.supersedes ?? []);
        const publicLink = siteUrl('/world_records');
        mails.push({
          to: recipients,
          subject: `Approved: ${title}`,
          text: `Congratulations! The ISA approved and published this claim.\n\n${details}${context.comment ? `\n\nComment from the ISA: ${context.comment}` : ''}\n\nSee it on ${publicLink}`,
        });
        mails.push({
          to: [communicationTeam()],
          subject: `Published, ready to announce: ${title}`,
          text: [details, ...(previous.length ? ['', ...previous] : []), '', `Public list: ${publicLink}`].join('\n'),
        });
        break;
      }
      case 'changes_requested':
        mails.push({
          to: recipients,
          subject: `Changes requested: ${title}`,
          text: `The ISA asked for changes before it can decide on this claim.\n\nComment: ${context.comment ?? ''}\n\n${details}\n\nEdit the claim: ${siteUrl(`/world_records/claim?kind=${entry.kind}&id=${entry.entryId}`)}`,
        });
        break;
      case 'rejected':
        mails.push({
          to: recipients,
          subject: `Not approved: ${title}`,
          text: `The ISA did not approve this claim.\n\nReason: ${context.comment ?? ''}\n\n${details}\n\nYour claims: ${myClaims}`,
        });
        break;
    }

    const results = await Promise.allSettled(mails.map(sendMail));
    for (const result of results) {
      if (result.status === 'rejected') console.error(`[records] Failed to send ${event} email for ${entry.entryId}:`, result.reason);
    }
  } catch (error) {
    console.error('[records] Failed to send notification:', error);
  }
}
