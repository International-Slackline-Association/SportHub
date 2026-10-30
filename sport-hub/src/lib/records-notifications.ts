/**
 * Emails for record and first claims (requirements §7.7): the athletes and the
 * claimant on every status change, the records team on submission and the
 * communication team on approval.
 */

import { formatISODay } from '@utils/dates';
import { getRecordCategory } from './records-service';
import { formatRecordValue, GENDER_TITLE_LABELS } from './records-logic';
import { getUser } from './user-service';
import { sendMail, siteUrl } from './mailer';
import { formatFileSize, RECORDS_TEAM_EMAIL } from './records-rules';
import { evidenceFolderUrl } from './records-evidence';
import { getCountryByCode } from '@utils/countries';
import type { WorldRecordTableItem, WorldRecordOrFirstTableItem } from './relational-types';

export type ClaimEvent = 'submitted' | 'approved' | 'changes_requested' | 'rejected';

export interface ClaimEventContext {
  comment?: string;
  supersedes?: WorldRecordTableItem[];   // Records this approval made historical
  categoryStatus?: 'active' | 'unchallenged' | 'archived';
  activated?: boolean;                    // The approval challenged an Unchallenged category, now Active
}

const reviewTeam = () => process.env.RECORDS_REVIEW_EMAIL || RECORDS_TEAM_EMAIL;
const communicationTeam = () => process.env.RECORDS_COMMUNICATION_EMAIL || 'communication@slacklineinternational.org';

async function athleteEmails(entry: WorldRecordOrFirstTableItem): Promise<string[]> {
  const ids = [...new Set([entry.claimantUserId, ...entry.athletes.map(a => a.userId)].filter((id): id is string => !!id))];
  const profiles = await Promise.all(ids.map(id => getUser(id).catch(() => null)));
  return [
    ...profiles.map(p => p?.email).filter((e): e is string => !!e),
    ...entry.athletes.map(a => a.pendingUser?.email).filter((e): e is string => !!e),
  ];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const country = (code?: string) => (code && getCountryByCode(code)?.name) || code?.toUpperCase();

/** Witness email addresses (older claims had one contact field that could be a phone number). */
const witnessEmails = (entry: WorldRecordOrFirstTableItem) =>
  entry.kind === 'record' ? entry.witnesses.map(w => (w.email ?? w.contact ?? '').trim()).filter(c => EMAIL.test(c)) : [];

/** Everything on the claim, for the submission emails. */
function fullDetails(entry: WorldRecordOrFirstTableItem): string[] {
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
    if (entry.witnesses.length > 0) lines.push('', 'Witnesses:', ...entry.witnesses.map(w => `  ${[w.name, w.email, w.phone, w.contact].filter(Boolean).join(', ')}`));
    add('No full video because', entry.noFullVideoReason);
  } else {
    add('Why it is a first', entry.whyFirst);
    add('Similar tricks', entry.similarTricks);
    add('Line', entry.lineDetails);
  }
  lines.push('');
  add('Submitted by', entry.claimantName);
  add('Consent of all athletes', entry.consentConfirmed && 'confirmed');
  add('ISA ethics guidelines and Code of Conduct', entry.ethicsConfirmed && 'confirmed');
  return lines;
}

/** Links with their address; files by name only, since the evidence folder is internal to the ISA. */
const evidenceLine = (e: WorldRecordOrFirstTableItem['evidence'][number]) => {
  const what = e.type === 'link' ? e.url : `file ${e.fileName ?? ''}${e.size ? `, ${formatFileSize(e.size)}` : ''}`;
  const label = e.description ?? e.label;
  return `  ${label ? `${label}: ` : ''}${what}`;
};

/** The claim's Drive folder, for the records team. */
const evidenceFolderLine = (entry: WorldRecordOrFirstTableItem) => {
  const folder = evidenceFolderUrl(entry.evidenceFolderId);
  return folder ? `Evidence folder: ${folder.startsWith('/') ? siteUrl(folder) : folder}` : 'No evidence folder';
};

async function summary(entry: WorldRecordOrFirstTableItem): Promise<{ title: string; lines: string[] }> {
  const athletes = entry.athletes.map(a => `${a.name}${a.country ? ` (${country(a.country)})` : ''}`).join(', ');
  const where = [entry.locationName, country(entry.locationCountry)].filter(Boolean).join(', ');
  const lines = [`Athletes: ${athletes}${entry.athletes.length > 1 ? ' (one joint performance)' : ''}`, `List: ${GENDER_TITLE_LABELS[entry.gender]}`];
  let title: string;
  if (entry.kind === 'record') {
    const category = entry.categoryId.startsWith('proposed-') ? null : await getRecordCategory(entry.categoryId);
    const value = category ? formatRecordValue(category, entry.value) : entry.value.original ?? '';
    title = `World record: ${entry.newCategoryProposal && !category ? '[New category] ' : ''}${entry.categoryName}, ${value}`;
    lines.unshift(`Category: ${entry.categoryName}`, `Value: ${value}`);
  } else {
    title = `World first: ${entry.trickName} (${entry.categoryName})`;
    lines.unshift(`Discipline: ${entry.categoryName}`, `Trick: ${entry.trickName}`);
    if (entry.description) lines.push(`Description: ${entry.description}`);
  }
  if (entry.date) lines.push(`Date: ${formatISODay(entry.date)}`);
  if (where) lines.push(`Location: ${where}`);
  if (entry.evidence.length > 0) lines.push('Evidence:', ...entry.evidence.map(evidenceLine));
  return { title, lines };
}

async function superseded(entry: WorldRecordOrFirstTableItem, supersedes: WorldRecordTableItem[]): Promise<string[]> {
  if (entry.kind !== 'record' || supersedes.length === 0) return [];
  const category = await getRecordCategory(entry.categoryId);
  return [
    'Previous record:',
    ...supersedes.map(old => `  ${old.athletes.map(a => a.name).join(', ')}: ${category ? formatRecordValue(category, old.value) : old.value.original ?? ''}${old.date ? ` (${formatISODay(old.date)})` : ''}`),
  ];
}

/** Never throws: a failed email must not block or roll back the action (FR-31). */
export async function notifyClaimEvent(event: ClaimEvent, entry: WorldRecordOrFirstTableItem, context: ClaimEventContext = {}): Promise<void> {
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
          text: `${entry.claimantName ?? 'Someone'} submitted a claim.\n\n${evidenceFolderLine(entry)}\n\n${all}\n\nReview it: ${siteUrl(`/admin/records-review/${entry.kind}/${entry.entryId}`)}`,
        });
        break;
      }
      case 'approved': {
        const previous = await superseded(entry, context.supersedes ?? []);
        const publicLink = siteUrl('/world_records');
        // §4: an achievement in an Unchallenged category is not a World Record yet
        const standing = context.categoryStatus === 'unchallenged'
          ? 'It is published in an Unchallenged category: it is not a World Record yet. It becomes one when another athlete equals or beats it, and the certificate becomes available then.'
          : context.activated
            ? 'This claim challenged an Unchallenged category, so the category is now Active and its best performances are World Records.'
            : '';
        mails.push({
          to: recipients,
          subject: `Approved: ${title}`,
          text: `Congratulations! The ISA approved and published this claim.${standing ? ` ${standing}` : ''}\n\n${details}${context.comment ? `\n\nComment from the ISA: ${context.comment}` : ''}\n\nSee it on ${publicLink}`,
        });
        mails.push({
          to: [communicationTeam()],
          subject: `Published, ready to announce: ${title}`,
          text: [...(standing ? [standing, ''] : []), details, ...(previous.length ? ['', ...previous] : []), '', `Public list: ${publicLink}`].join('\n'),
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
