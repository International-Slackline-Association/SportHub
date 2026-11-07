'use client';

/**
 * Sections both claim forms share (requirements §8): athletes, witnesses,
 * evidence and the ethics confirmation.
 */

import { useEffect } from 'react';
import { getIn, FieldArray, useFormikContext } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikCheckboxField, FormikTextField } from '@ui/Form';
import { ETHICS_STATEMENT, MAX_ATHLETES, MAX_WITNESSES, MIN_WITNESSES } from '@lib/records-rules';
import type { ClaimFormValues } from '../types';
import AthletePicker from './AthletePicker';
import EvidenceFields, { type EnsureClaimSaved } from './EvidenceFields';

export function Section({ title, children, description }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="p-4 sm:p-0 stack gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <div className="text-sm text-gray-600">{description}</div>}
      {children}
    </section>
  );
}

/** A list-level validation message, e.g. "Name at least 2 witnesses". Shown once the form was submitted. */
export function ListError({ name }: { name: string }) {
  const { errors, submitCount } = useFormikContext<ClaimFormValues>();
  const error = getIn(errors, name);
  if (submitCount === 0 || typeof error !== 'string') return null;
  return <p className="text-sm text-red-600">{error}</p>;
}

type AthletesProps = {
  isFirst: boolean;
  claimantId: string;
  admin: boolean;
  /** Extra content under the athletes, e.g. the list and mark to beat of a record. */
  children?: React.ReactNode;
};

export function AthletesSection({ isFirst, claimantId, admin, children }: AthletesProps) {
  const { values } = useFormikContext<ClaimFormValues>();
  const athleteCount = values.athletes.length;
  const isClaimantOnlyAthlete = athleteCount === 1 && values.athletes[0].userId === claimantId;

  return (
    <Section
      title="Athletes"
      description={
        <div className="stack gap-1">
          <p>Add more than one athlete only if they did this <strong>together, as one joint performance</strong> (for example a tandem walk or a group rigging). They then hold one {isFirst ? 'first' : 'record'} with several athletes.</p>
          <p>If several people reached the same {isFirst ? 'trick' : 'value'} <strong>separately</strong>, they are co-holders: each of them submits their own claim with their own video and witnesses.</p>
        </div>
      }
    >
      <FieldArray name="athletes">
        {({ push, remove }) => (
          <div className="stack gap-3">
            {values.athletes.map((_, i) => (
              <AthletePicker key={i} index={i} onRemove={athleteCount > 1 ? () => remove(i) : undefined} />
            ))}
            {athleteCount < MAX_ATHLETES && (
              <div>
                <Button type="button" variant="secondary" size="small" onClick={() => push({ name: '' })}>
                  Add an athlete to this joint performance
                </Button>
              </div>
            )}
          </div>
        )}
      </FieldArray>
      <ListError name="athletes" />
      {athleteCount > 1 && !admin && (
        <FormikCheckboxField
          id="jointConfirmed"
          name="jointConfirmed"
          label="These athletes did this together as one joint performance. They are not co-holders who did it separately."
        />
      )}
      {!isClaimantOnlyAthlete && !admin && (
        <FormikCheckboxField
          id="consentConfirmed"
          name="consentConfirmed"
          label="I have the consent of every athlete on this claim to submit it for them."
        />
      )}
      {children}
    </Section>
  );
}

export function WitnessesSection({ isFirst }: { isFirst: boolean }) {
  const { values } = useFormikContext<ClaimFormValues>();
  return (
    <Section title="Witnesses" description={`At least ${MIN_WITNESSES} witnesses who saw the ${isFirst ? 'landing' : 'attempt'}.`}>
      <FieldArray name="witnesses">
        {({ push, remove }) => (
          <div className="stack gap-3">
            {values.witnesses.map((_, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
                <FormikTextField id={`witnesses.${i}.name`} name={`witnesses.${i}.name`} label="Name" required={i < MIN_WITNESSES} />
                <FormikTextField id={`witnesses.${i}.email`} name={`witnesses.${i}.email`} type="email" label="Email" required={i < MIN_WITNESSES} />
                <FormikTextField id={`witnesses.${i}.phone`} name={`witnesses.${i}.phone`} type="tel" label="Phone" />
                {i >= MIN_WITNESSES ? (
                  <button type="button" className="text-xs text-red-600 underline pb-2" onClick={() => remove(i)}>Remove</button>
                ) : <span />}
              </div>
            ))}
            {values.witnesses.length < MAX_WITNESSES && (
              <div>
                <Button type="button" variant="secondary" size="small" onClick={() => push({ name: '', email: '', phone: '' })}>Add a witness</Button>
              </div>
            )}
          </div>
        )}
      </FieldArray>
      <ListError name="witnesses" />
    </Section>
  );
}

type EvidenceProps = {
  description: string;
  ensureSaved: EnsureClaimSaved;
  uploadsEnabled: boolean;
  /** Fields above the list, e.g. the record's "There is a full video" checkbox. */
  children?: React.ReactNode;
};

export function EvidenceSection({ description, ensureSaved, uploadsEnabled, children }: EvidenceProps) {
  return (
    <Section
      title="Video and evidence"
      description={<>{description} Add links (e.g. YouTube) or upload files (photos, videos, GPS tracks, measurements), each with a description.</>}
    >
      {children}
      <EvidenceFields ensureSaved={ensureSaved} uploadsEnabled={uploadsEnabled} />
      <ListError name="evidence" />
    </Section>
  );
}

export function EthicsSection() {
  return (
    <Section title="Ethics">
      <FormikCheckboxField id="ethicsConfirmed" name="ethicsConfirmed" label={ETHICS_STATEMENT} />
    </Section>
  );
}

/** Points to the marked fields after a submit that failed validation. */
export function ValidationSummary() {
  const { submitCount, isValid } = useFormikContext<ClaimFormValues>();
  if (submitCount === 0 || isValid) return null;
  return (
    <section className="p-4 sm:p-0">
      <Alert variant="error">Some fields need attention. They are marked above.</Alert>
    </section>
  );
}

/** Reports the form's values, so a switch between record and first can keep what was typed. */
export function ValuesObserver({ onChange }: { onChange?: (values: ClaimFormValues) => void }) {
  const { values } = useFormikContext<ClaimFormValues>();
  useEffect(() => { onChange?.(values); }, [values, onChange]);
  return null;
}
