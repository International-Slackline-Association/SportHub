'use client';

/**
 * The fields of a world first claim (requirements §8.2): discipline, athletes,
 * the trick, witnesses and evidence. Shared by the claimant's form and the
 * admin "Modify" form.
 */

import { FormikSelectField, FormikTextAreaField, FormikTextField } from '@ui/Form';
import type { FirstCategoryTableItem } from '@lib/relational-types';
import type { EnsureClaimSaved } from './EvidenceFields';
import { AthletesSection, EthicsSection, EvidenceSection, Section, WitnessesSection } from './ClaimSections';

export type WorldFirstClaimFieldsProps = {
  firstCategories: FirstCategoryTableItem[];
  claimantId: string;
  /** Admin mode hides the claimant's confirmations. */
  admin?: boolean;
  ensureSaved: EnsureClaimSaved;
  uploadsEnabled: boolean;
};

export default function WorldFirstClaimFields({ firstCategories, claimantId, admin = false, ensureSaved, uploadsEnabled }: WorldFirstClaimFieldsProps) {
  const disciplineOptions = firstCategories.map(c => ({ value: c.categoryId, label: c.name }));

  return (
    <>
      <Section title="Discipline">
        <FormikSelectField id="categoryId" name="categoryId" label="Discipline" options={disciplineOptions} required />
      </Section>

      <AthletesSection isFirst claimantId={claimantId} admin={admin} />

      <Section title="The trick">
        <FormikTextField id="trickName" name="trickName" label="Trick name" required />
        <FormikTextAreaField id="description" name="description" label="Description of the trick" required={!admin} />
        <FormikTextAreaField id="whyFirst" name="whyFirst" label="Why is it a first?" required={!admin} caption="What makes it new compared to existing tricks." />
        <FormikTextAreaField id="similarTricks" name="similarTricks" label="Similar tricks" caption="Tricks that come close, so the ISA can tell them apart." />
        <FormikTextField id="lineDetails" name="lineDetails" label="Line details" caption="Line type, length, height, tension" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormikTextField id="date" name="date" type="date" label="Date of the landing" required />
          <FormikTextField id="locationName" name="locationName" label="Location" />
        </div>
      </Section>

      <WitnessesSection isFirst />

      <EvidenceSection description="At least one video showing the trick being landed." ensureSaved={ensureSaved} uploadsEnabled={uploadsEnabled} />

      {!admin && <EthicsSection />}
    </>
  );
}
