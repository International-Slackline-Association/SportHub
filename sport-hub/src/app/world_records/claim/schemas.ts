/**
 * Client-side validation of the claim forms, so the claimant sees problems
 * while filling in the form. The server checks the same rules again on submit
 * (validateForSubmit in lib/records-claims.ts). Drafts are saved without them.
 */

import * as Yup from 'yup';
import { isValidUrl, INVALID_URL_MESSAGE } from '@utils/urls';
import { MAX_ATHLETES, MAX_EVIDENCE_ITEMS, MAX_WITNESSES, MIN_WITNESSES } from '@lib/records-rules';
import type { ClaimAthleteValue, ClaimEvidenceValue } from './types';

type SchemaOptions = {
  claimantId: string;
  /** Admins correct entries, including imported ones without witnesses or confirmations. */
  admin?: boolean;
};

const REQUIRED = 'Required';

const today = () => new Date().toISOString().slice(0, 10);

const isFilledWitness = (w: { name?: string; email?: string; phone?: string }) =>
  !!(w.name?.trim() || w.email?.trim() || w.phone?.trim());

// Formik passes empty fields as undefined, so every field is optional here
const isFilledEvidence = (e: Partial<ClaimEvidenceValue>) => (e.type === 'link' ? !!e.url?.trim() : !!e.driveFileId);

const athleteSchema = (admin?: boolean) => Yup.object({
  name: Yup.string(),
  userId: Yup.string(),
  pendingUser: Yup.object({
    name: Yup.string().trim().required(REQUIRED),
    surname: Yup.string().trim().required(REQUIRED),
    email: Yup.string().trim().email('Enter a valid email').required(REQUIRED),
    gender: Yup.string().required(REQUIRED),
  }).default(undefined),
}).test(
  'athlete-chosen',
  'Choose a SportHub profile or add a new athlete',
  // Imported entries may name athletes without a profile; admins link them later
  value => !!(value?.userId || value?.pendingUser || (admin && value?.name?.trim())),
);

const witnessSchema = Yup.object().shape({
  name: Yup.string().trim().when(['email', 'phone'], ([email, phone], s) => (email || phone ? s.required(REQUIRED) : s)),
  email: Yup.string().trim().email('Enter a valid email').when(['name', 'phone'], ([name, phone], s) => (name || phone ? s.required(REQUIRED) : s)),
  phone: Yup.string(),
}, [['name', 'email']]);

const evidenceSchema = Yup.object({
  type: Yup.mixed<'link' | 'file'>().oneOf(['link', 'file']).required(),
  url: Yup.string().test('url', INVALID_URL_MESSAGE, function (url) {
    return this.parent.type !== 'link' || !url?.trim() || isValidUrl(url);
  }),
  description: Yup.string().test('description', 'Add a description', function (description) {
    return !isFilledEvidence(this.parent as ClaimEvidenceValue) || !!description?.trim();
  }),
});

/** Fields both kinds of claim share: athletes, date, witnesses, evidence, confirmations. */
function commonFields({ claimantId, admin }: SchemaOptions, evidenceRequired: (fullVideo: boolean) => boolean, evidenceMessage: string) {
  return {
    athletes: Yup.array(athleteSchema(admin)).min(1, 'Add at least one athlete').max(MAX_ATHLETES, `At most ${MAX_ATHLETES} athletes`),
    date: Yup.string().required(REQUIRED).test('not-future', 'The date cannot be in the future', d => !d || d <= today()),
    witnesses: admin
      ? Yup.array(witnessSchema)
      : Yup.array(witnessSchema)
        .test('min-witnesses', `Name at least ${MIN_WITNESSES} witnesses`, ws => (ws ?? []).filter(isFilledWitness).length >= MIN_WITNESSES)
        .test('max-witnesses', `Name at most ${MAX_WITNESSES} witnesses`, ws => (ws ?? []).filter(isFilledWitness).length <= MAX_WITNESSES),
    evidence: Yup.array(evidenceSchema)
      .test('max-evidence', `At most ${MAX_EVIDENCE_ITEMS} pieces of evidence`, items => (items ?? []).filter(i => isFilledEvidence(i as ClaimEvidenceValue)).length <= MAX_EVIDENCE_ITEMS)
      .test('evidence-required', evidenceMessage, function (items) {
        if (admin || !evidenceRequired(this.parent.fullVideo)) return true;
        return (items ?? []).some(i => isFilledEvidence(i as ClaimEvidenceValue));
      }),
    jointConfirmed: Yup.boolean().test('joint', 'Confirm that the athletes did this as one joint performance', function (confirmed) {
      return admin || this.parent.athletes.length <= 1 || !!confirmed;
    }),
    consentConfirmed: Yup.boolean().test('consent', 'Confirm that you have the consent of every athlete on this claim', function (confirmed) {
      const athletes: ClaimAthleteValue[] = this.parent.athletes;
      const isClaimantOnlyAthlete = athletes.length === 1 && athletes[0].userId === claimantId;
      return admin || isClaimantOnlyAthlete || !!confirmed;
    }),
    ethicsConfirmed: admin ? Yup.boolean() : Yup.boolean().oneOf([true], 'Confirm the ISA ethics guidelines and Code of Conduct'),
  };
}

export const worldRecordClaimSchema = (options: SchemaOptions) => Yup.object({
  ...commonFields(options, fullVideo => fullVideo, 'Add the video of the attempt, as a link or a file'),
  path: Yup.mixed<'existing' | 'new_category'>().oneOf(['existing', 'new_category']).required(),
  categoryId: Yup.string().when('path', { is: 'existing', then: s => s.required('Choose a record category') }),
  newCategory: Yup.object().when('path', {
    is: 'new_category',
    then: () => Yup.object({
      name: Yup.string().trim().required(REQUIRED),
      measurement: Yup.string().trim().required(REQUIRED),
      unit: Yup.string().trim().required(REQUIRED),
      direction: Yup.string().oneOf(['higher', 'lower']).required(REQUIRED),
      justification: Yup.string().trim().required(REQUIRED),
    }),
  }),
  valueText: Yup.string().trim().required(REQUIRED),
  locationName: options.admin ? Yup.string() : Yup.string().trim().required(REQUIRED),
  locationCountry: options.admin ? Yup.string() : Yup.string().required(REQUIRED),
  noFullVideoReason: Yup.string().when('fullVideo', {
    is: false,
    then: s => (options.admin ? s : s.trim().required('Explain why there is no full video')),
  }),
});

export const worldFirstClaimSchema = (options: SchemaOptions) => Yup.object({
  ...commonFields(options, () => true, 'Add at least one video showing the trick being landed, as a link or a file'),
  categoryId: Yup.string().required('Choose a discipline'),
  trickName: Yup.string().trim().required(REQUIRED),
  description: options.admin ? Yup.string() : Yup.string().trim().required(REQUIRED),
  whyFirst: options.admin ? Yup.string() : Yup.string().trim().required(REQUIRED),
});
